import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { executeAgentTool } from "@/lib/agent-tools/outfit-skill-tools";
import { db } from "@/lib/db/client";
import { assets, generationImages, generations, projects } from "@/lib/db/schema";
import { getProjectGenerationById, listProjectGenerations } from "@/lib/generation/generation-repository";
import type { ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo, getCurrentProjectState, saveCurrentProjectState } from "@/lib/projects/project-repository";
import { resolveGeneratedResultPath } from "@/lib/storage/generated-result-storage";
import { createDefaultWorkflowSnapshot, snapshotKey, workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function productAsset(projectId: string, id: string): typeof assets.$inferInsert {
  return {
    id,
    projectId,
    type: "product",
    fileName: `product-${crypto.randomUUID()}.png`,
    originalFileName: `${id}.png`,
    relativePath: `assets/${id}.png`,
    publicUrl: `/api/assets/${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 1000,
    height: 1200,
    createdAt: new Date().toISOString()
  };
}

function successAdapter(callCounter: { count: number }): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage() {
      callCounter.count += 1;
      return {
        providerId: "openai",
        model: "test-agent-tool-model",
        artifacts: [
          {
            mimeType: "image/png",
            data: {
              kind: "base64",
              value: pngBase64
            }
          }
        ],
        warnings: []
      };
    }
  };
}

async function removeGeneratedFiles(fileNames: string[]) {
  await Promise.all(fileNames.map((fileName) => rm(resolveGeneratedResultPath(fileName), { force: true })));
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key-agent-tool";
  const project = await getCurrentProjectInfo();
  const assetRows = [
    productAsset(project.id, `agent-tool-top-${crypto.randomUUID()}`),
    productAsset(project.id, `agent-tool-bottom-${crypto.randomUUID()}`),
    productAsset(project.id, `agent-tool-shoes-${crypto.randomUUID()}`),
    productAsset(project.id, `agent-tool-bag-${crypto.randomUUID()}`)
  ];
  const otherProjectId = `agent-tool-project-${crypto.randomUUID()}`;
  const crossProjectAsset = productAsset(otherProjectId, `agent-tool-cross-${crypto.randomUUID()}`);
  const generationIds: string[] = [];
  const generatedFileNames: string[] = [];
  const originalWorkflowState = await getCurrentProjectState();

  try {
    db.insert(projects)
      .values({
        id: otherProjectId,
        name: "Agent Tool Other Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .run();
    assetRows.forEach((row) => db.insert(assets).values(row).run());
    db.insert(assets).values(crossProjectAsset).run();

    const validBindings = {
      top: assetRows[0].id,
      bottom: assetRows[1].id,
      shoes: assetRows[2].id
    };

    const validSk01 = await executeAgentTool({
      toolName: "validate_outfit_skill",
      input: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        contentType: "men",
        assetBindings: validBindings
      }
    });
    assert.equal(validSk01.ok, true);
    assert.equal((validSk01.data as { validation: { status: string } }).validation.status, "pass");

    const missingShoes = await executeAgentTool({
      toolName: "validate_outfit_skill",
      input: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        assetBindings: {
          top: assetRows[0].id,
          bottom: assetRows[1].id
        }
      }
    });
    assert.equal(missingShoes.ok, true);
    assert.equal((missingShoes.data as { validation: { status: string } }).validation.status, "fail");

    const sk03Fail = await executeAgentTool({
      toolName: "validate_outfit_skill",
      input: {
        skillId: "SK03_LOOK_BREAKDOWN",
        assetBindings: {
          top: assetRows[0].id,
          bottom: assetRows[1].id
        }
      }
    });
    assert.equal(sk03Fail.ok, true);
    assert.equal((sk03Fail.data as { validation: { status: string } }).validation.status, "fail");

    const sk03Pass = await executeAgentTool({
      toolName: "validate_outfit_skill",
      input: {
        skillId: "SK03_LOOK_BREAKDOWN",
        assetBindings: validBindings
      }
    });
    assert.equal(sk03Pass.ok, true);
    assert.equal((sk03Pass.data as { validation: { status: string } }).validation.status, "pass");

    const badInputs = [
      {
        input: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: "https://example.com/a.png" } },
        code: "SKILL_INVALID_ASSET_BINDING"
      },
      {
        input: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: "..\\secret.png" } },
        code: "SKILL_INVALID_ASSET_BINDING"
      },
      {
        input: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { torso: assetRows[0].id } },
        code: "SKILL_INVALID_SLOT"
      },
      {
        input: {
          skillId: "SK01_MINIMAL_FLAT_LAY",
          assetBindings: validBindings,
          overrides: { productFidelity: false }
        },
        code: "SKILL_UNSUPPORTED_OVERRIDE"
      },
      {
        input: {
          skillId: "SK01_MINIMAL_FLAT_LAY",
          assetBindings: validBindings,
          overrides: { model: "not-allowed" }
        },
        code: "SKILL_UNSUPPORTED_OVERRIDE"
      },
      {
        input: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: crossProjectAsset.id } },
        code: "SKILL_ASSET_PROJECT_MISMATCH"
      },
      {
        input: { skillId: "../../NOPE", assetBindings: validBindings },
        code: "SKILL_NOT_FOUND"
      }
    ];

    for (const item of badInputs) {
      const result = await executeAgentTool({ toolName: "validate_outfit_skill", input: item.input });
      assert.equal(result.ok, false);
      assert.equal(result.error.code, item.code);
    }

    const currentStudioSnapshot = {
      ...createDefaultWorkflowSnapshot(),
      selectedSkillId: "SK05_JAPANESE_CATALOG" as const,
      outfitSlots: {
        ...createDefaultWorkflowSnapshot().outfitSlots,
        bag: assetRows[3].id
      },
      look: {
        presetId: "L05" as const
      },
      composition: {
        presetId: "C02" as const,
        graphicPresetId: "G04" as const
      }
    };
    await saveCurrentProjectState({ workflowSnapshot: currentStudioSnapshot });
    const studioBefore = await getCurrentProjectState();
    const studioBeforeKey = snapshotKey(currentStudioSnapshot);

    const calls = { count: 0 };
    const autoResult = await executeAgentTool({
      toolName: "execute_outfit_skill",
      input: {
        skillId: "SK02_INVISIBLE_EDITORIAL",
        assetBindings: validBindings,
        overrides: {
          quality: "draft"
        }
      },
      adapters: { openai: successAdapter(calls) }
    });
    assert.equal(autoResult.ok, true);
    const autoData = autoResult.data as {
      mode: string;
      skill: { id: string };
      generation: { id: string };
      result: { imageUrl: string } | null;
    };
    assert.equal(autoData.mode, "automatic");
    assert.equal(autoData.skill.id, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(calls.count, 1);
    assert.ok(autoData.generation.id);
    assert.ok(autoData.result?.imageUrl);
    generationIds.push(autoData.generation.id);
    generatedFileNames.push(autoData.result.imageUrl.split("/").at(-1) ?? "");

    const persisted = getProjectGenerationById({ projectId: project.id, generationId: autoData.generation.id });
    assert.ok(persisted);
    assert.equal(persisted.skillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.selectedSkillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.look.presetId, "L03");
    assert.equal(persisted.workflowSnapshot.composition.presetId, "C04");
    assert.equal(persisted.workflowSnapshot.outfitSlots.bag, null);

    const studioAfter = await getCurrentProjectState();
    assert.equal(snapshotKey(workflowDraftToSnapshot(studioAfter.workflow)), studioBeforeKey);
    assert.deepEqual(studioAfter.workflow, studioBefore.workflow);

    const missingCalls = { count: 0 };
    const blockedExecute = await executeAgentTool({
      toolName: "execute_outfit_skill",
      input: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        assetBindings: {
          top: assetRows[0].id,
          bottom: assetRows[1].id
        }
      },
      adapters: { openai: successAdapter(missingCalls) }
    });
    assert.equal(blockedExecute.ok, false);
    assert.equal(blockedExecute.error.code, "SKILL_VALIDATION_FAILED");
    assert.equal(missingCalls.count, 0);

    const historyBeforeManual = listProjectGenerations({ projectId: project.id, limit: 50 }).length;
    const manualResult = await executeAgentTool({
      toolName: "execute_outfit_skill",
      input: {
        skillId: "SK05_JAPANESE_CATALOG",
        assetBindings: validBindings,
        overrides: {
          providerId: "chatgpt_manual"
        }
      }
    });
    assert.equal(manualResult.ok, true);
    const manualData = manualResult.data as {
      mode: string;
      generation: null;
      manualPackage: {
        status: string;
        workflowSnapshot?: { selectedSkillId: string | null };
        referenceAssets: Array<{ assetId: string }>;
      };
    };
    assert.equal(manualData.mode, "manual");
    assert.equal(manualData.generation, null);
    assert.equal(manualData.manualPackage.status, "ready");
    assert.equal(manualData.manualPackage.workflowSnapshot?.selectedSkillId, "SK05_JAPANESE_CATALOG");
    assert.deepEqual(
      manualData.manualPackage.referenceAssets.map((asset) => asset.assetId).sort(),
      [assetRows[0].id, assetRows[1].id, assetRows[2].id].sort()
    );
    assert.equal(listProjectGenerations({ projectId: project.id, limit: 50 }).length, historyBeforeManual);

    const text = JSON.stringify({ autoData, manualData, persisted });
    assert.doesNotMatch(text, /sk-[A-Za-z0-9_-]{40,}|Authorization|[A-Z]:\\\\[A-Za-z]|storage[\\/]|rawProviderPayload|OPENAI_API_KEY/);
  } finally {
    await saveCurrentProjectState({ workflowSnapshot: workflowDraftToSnapshot(originalWorkflowState.workflow) });
    if (generationIds.length) {
      db.delete(generationImages).where(inArray(generationImages.generationId, generationIds.filter(Boolean))).run();
      db.delete(generations).where(inArray(generations.id, generationIds.filter(Boolean))).run();
    }
    db.delete(assets).where(inArray(assets.id, [...assetRows.map((row) => row.id), crossProjectAsset.id])).run();
    db.delete(projects).where(eq(projects.id, otherProjectId)).run();
    await removeGeneratedFiles(generatedFileNames);
    if (previousOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAIKey;
    }
  }

  console.log("Agent tool execution tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


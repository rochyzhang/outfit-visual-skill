import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assets, generationImages, generations, projects } from "@/lib/db/schema";
import { getProjectGenerationById, listProjectGenerations } from "@/lib/generation/generation-repository";
import type { ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { callMcpSkillTool, handleMcpJsonRpcMessage } from "@/lib/mcp/outfit-skill-mcp";
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
        model: "test-mcp-tool-model",
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
  process.env.OPENAI_API_KEY = "test-openai-key-mcp-tool";
  const project = await getCurrentProjectInfo();
  const assetRows = [
    productAsset(project.id, `mcp-tool-top-${crypto.randomUUID()}`),
    productAsset(project.id, `mcp-tool-bottom-${crypto.randomUUID()}`),
    productAsset(project.id, `mcp-tool-shoes-${crypto.randomUUID()}`),
    productAsset(project.id, `mcp-tool-bag-${crypto.randomUUID()}`)
  ];
  const otherProjectId = `mcp-tool-project-${crypto.randomUUID()}`;
  const crossProjectAsset = productAsset(otherProjectId, `mcp-tool-cross-${crypto.randomUUID()}`);
  const generationIds: string[] = [];
  const generatedFileNames: string[] = [];
  const originalWorkflowState = await getCurrentProjectState();

  try {
    db.insert(projects)
      .values({
        id: otherProjectId,
        name: "MCP Tool Other Project",
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

    const listCall = await callMcpSkillTool({ name: "list_outfit_skills", arguments: {} });
    assert.equal(listCall.structuredContent.ok, true);
    assert.equal((listCall.structuredContent.data as { skills: unknown[] }).skills.length, 6);
    assert.doesNotMatch(JSON.stringify(listCall), /couple/i);

    const getCall = await handleMcpJsonRpcMessage({
      jsonrpc: "2.0",
      id: "get-skill",
      method: "tools/call",
      params: {
        name: "get_outfit_skill",
        arguments: {
          skillId: "SK02_INVISIBLE_EDITORIAL"
        }
      }
    });
    assert.ok(getCall && "result" in getCall);
    const getResult = getCall.result as { structuredContent: { ok: true; data: { skill: { defaults: Record<string, unknown> } } } };
    assert.equal(getResult.structuredContent.data.skill.defaults.scenePresetId, "S05");
    assert.equal(getResult.structuredContent.data.skill.defaults.compositionPresetId, "C04");
    assert.equal(getResult.structuredContent.data.skill.defaults.graphicPresetId, "None");
    assert.equal(getResult.structuredContent.data.skill.defaults.lookPresetId, "L03");
    assert.equal(getResult.structuredContent.data.skill.defaults.aspectRatio, "3:4");
    assert.equal(getResult.structuredContent.data.skill.defaults.quality, "standard");

    const validSk01 = await callMcpSkillTool({
      name: "validate_outfit_skill",
      arguments: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        contentType: "men",
        assetBindings: validBindings
      }
    });
    assert.equal(validSk01.structuredContent.ok, true);
    assert.equal((validSk01.structuredContent.data as { validation: { status: string } }).validation.status, "pass");

    const missingShoes = await callMcpSkillTool({
      name: "validate_outfit_skill",
      arguments: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        assetBindings: {
          top: assetRows[0].id,
          bottom: assetRows[1].id
        }
      }
    });
    assert.equal(missingShoes.structuredContent.ok, true);
    assert.equal((missingShoes.structuredContent.data as { validation: { status: string } }).validation.status, "fail");

    const badInputs = [
      {
        arguments: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: "https://example.com/a.png" } },
        code: "SKILL_INVALID_ASSET_BINDING"
      },
      {
        arguments: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: "C:\\secret.png" } },
        code: "SKILL_INVALID_ASSET_BINDING"
      },
      {
        arguments: { skillId: "SK01_MINIMAL_FLAT_LAY", assetBindings: { top: crossProjectAsset.id } },
        code: "SKILL_ASSET_PROJECT_MISMATCH"
      }
    ];

    for (const item of badInputs) {
      const result = await callMcpSkillTool({ name: "validate_outfit_skill", arguments: item.arguments });
      assert.equal(result.structuredContent.ok, false);
      assert.equal(result.structuredContent.error.code, item.code);
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
    const autoResult = await callMcpSkillTool({
      name: "execute_outfit_skill",
      arguments: {
        skillId: "SK02_INVISIBLE_EDITORIAL",
        assetBindings: validBindings,
        overrides: {
          quality: "draft"
        }
      },
      adapters: { openai: successAdapter(calls) }
    });
    assert.equal(autoResult.structuredContent.ok, true);
    const autoData = autoResult.structuredContent.data as {
      mode: string;
      skill: { id: string };
      generation: { id: string };
      result: { imageUrl: string } | null;
    };
    assert.equal(autoData.mode, "automatic");
    assert.equal(autoData.skill.id, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(calls.count, 1);
    assert.ok(autoData.result?.imageUrl);
    generationIds.push(autoData.generation.id);
    generatedFileNames.push(autoData.result.imageUrl.split("/").at(-1) ?? "");

    const persisted = getProjectGenerationById({ projectId: project.id, generationId: autoData.generation.id });
    assert.ok(persisted);
    assert.equal(persisted.skillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.selectedSkillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.look.presetId, "L03");
    assert.equal(persisted.workflowSnapshot.outfitSlots.bag, null);

    const studioAfter = await getCurrentProjectState();
    assert.equal(snapshotKey(workflowDraftToSnapshot(studioAfter.workflow)), studioBeforeKey);
    assert.deepEqual(studioAfter.workflow, studioBefore.workflow);

    const blockedCalls = { count: 0 };
    const blockedExecute = await callMcpSkillTool({
      name: "execute_outfit_skill",
      arguments: {
        skillId: "SK01_MINIMAL_FLAT_LAY",
        assetBindings: {
          top: assetRows[0].id,
          bottom: assetRows[1].id
        }
      },
      adapters: { openai: successAdapter(blockedCalls) }
    });
    assert.equal(blockedExecute.structuredContent.ok, false);
    assert.equal(blockedExecute.structuredContent.error.code, "SKILL_VALIDATION_FAILED");
    assert.equal(blockedCalls.count, 0);

    const historyBeforeManual = listProjectGenerations({ projectId: project.id, limit: 50 }).length;
    const manualResult = await callMcpSkillTool({
      name: "execute_outfit_skill",
      arguments: {
        skillId: "SK05_JAPANESE_CATALOG",
        assetBindings: validBindings,
        overrides: {
          providerId: "chatgpt_manual"
        }
      }
    });
    assert.equal(manualResult.structuredContent.ok, true);
    const manualData = manualResult.structuredContent.data as {
      mode: string;
      generation: null;
      manualPackage: {
        status: string;
        workflowSnapshot?: { selectedSkillId: string | null };
      };
    };
    assert.equal(manualData.mode, "manual");
    assert.equal(manualData.generation, null);
    assert.equal(manualData.manualPackage.status, "ready");
    assert.equal(manualData.manualPackage.workflowSnapshot?.selectedSkillId, "SK05_JAPANESE_CATALOG");
    assert.equal(listProjectGenerations({ projectId: project.id, limit: 50 }).length, historyBeforeManual);

    const text = JSON.stringify({ autoResult, manualResult, persisted });
    assert.doesNotMatch(text, /sk-[A-Za-z0-9_-]{40,}|Authorization|[A-Z]:\\\\(?:Users|Windows|WINDOWS|Program Files)|storage[\\/]|rawProviderPayload|OPENAI_API_KEY/);
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

  console.log("MCP tool execution tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


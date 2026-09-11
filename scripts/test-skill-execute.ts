import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { inArray } from "drizzle-orm";
import { POST as executeSkillRoute } from "@/app/api/skills/[skillId]/execute/route";
import { db } from "@/lib/db/client";
import { assets, generationImages, generations } from "@/lib/db/schema";
import { getProjectGenerationById, listProjectGenerations } from "@/lib/generation/generation-repository";
import type { ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo, getCurrentProjectState, saveCurrentProjectState } from "@/lib/projects/project-repository";
import { executeSkillApiRequest, SkillApiError } from "@/lib/skills/skill-api-service";
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
        model: "test-skill-api-model",
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

async function json<T>(response: Response) {
  return (await response.json()) as T;
}

function executeRequest(body: unknown) {
  return new Request("http://localhost/api/skills/SK05_JAPANESE_CATALOG/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function removeGeneratedFiles(fileNames: string[]) {
  await Promise.all(fileNames.map((fileName) => rm(resolveGeneratedResultPath(fileName), { force: true })));
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key-skill-execute";
  const project = await getCurrentProjectInfo();
  const assetRows = [
    productAsset(project.id, `skill-execute-top-${crypto.randomUUID()}`),
    productAsset(project.id, `skill-execute-bottom-${crypto.randomUUID()}`),
    productAsset(project.id, `skill-execute-shoes-${crypto.randomUUID()}`),
    productAsset(project.id, `skill-execute-bag-${crypto.randomUUID()}`)
  ];
  const generationIds: string[] = [];
  const generatedFileNames: string[] = [];
  const originalWorkflowState = await getCurrentProjectState();

  try {
    assetRows.forEach((row) => db.insert(assets).values(row).run());

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
    const autoBody = {
      assetBindings: {
        top: assetRows[0].id,
        bottom: assetRows[1].id,
        shoes: assetRows[2].id
      },
      overrides: {
        quality: "draft"
      }
    };
    const autoResult = await executeSkillApiRequest({
      skillId: "SK02_INVISIBLE_EDITORIAL",
      body: autoBody,
      adapters: { openai: successAdapter(calls) }
    });

    assert.equal(autoResult.ok, true);
    assert.equal(autoResult.mode, "automatic");
    assert.equal(autoResult.skill.id, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(calls.count, 1);
    assert.ok(autoResult.generation.id);
    assert.ok(autoResult.result?.imageUrl);
    generationIds.push(autoResult.generation.id ?? "");
    generatedFileNames.push(autoResult.result?.imageUrl.split("/").at(-1) ?? "");

    const persisted = getProjectGenerationById({ projectId: project.id, generationId: autoResult.generation.id ?? "" });
    assert.ok(persisted);
    assert.equal(persisted.skillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.selectedSkillId, "SK02_INVISIBLE_EDITORIAL");
    assert.equal(persisted.workflowSnapshot.look.presetId, "L03");
    assert.equal(persisted.workflowSnapshot.composition.presetId, "C04");
    assert.equal(persisted.workflowSnapshot.outfitSlots.bag, null);
    assert.equal(persisted.workflowSnapshot.outfitSlots.top, assetRows[0].id);
    assert.equal(persisted.workflowSnapshot.outfitSlots.bottom, assetRows[1].id);
    assert.equal(persisted.workflowSnapshot.outfitSlots.shoes, assetRows[2].id);

    const studioAfter = await getCurrentProjectState();
    assert.equal(snapshotKey(workflowDraftToSnapshot(studioAfter.workflow)), studioBeforeKey);
    assert.deepEqual(studioAfter.workflow, studioBefore.workflow);

    const missingCalls = { count: 0 };
    await assert.rejects(
      () =>
        executeSkillApiRequest({
          skillId: "SK01_MINIMAL_FLAT_LAY",
          body: {
            assetBindings: {
              top: assetRows[0].id,
              bottom: assetRows[1].id
            }
          },
          adapters: { openai: successAdapter(missingCalls) }
        }),
      (error: unknown) => error instanceof SkillApiError && error.error.code === "SKILL_VALIDATION_FAILED"
    );
    assert.equal(missingCalls.count, 0);

    const historyBeforeManual = listProjectGenerations({ projectId: project.id, limit: 50 }).length;
    const manualResponse = await executeSkillRoute(executeRequest({
      assetBindings: {
        top: assetRows[0].id,
        bottom: assetRows[1].id,
        shoes: assetRows[2].id
      },
      overrides: {
        providerId: "chatgpt_manual"
      }
    }), {
      params: Promise.resolve({ skillId: "SK05_JAPANESE_CATALOG" })
    });
    assert.equal(manualResponse.status, 200);
    const manualPayload = await json<{
      ok: boolean;
      mode: string;
      generation: null;
      manualPackage: {
        status: string;
        workflowSnapshot?: { selectedSkillId: string | null };
        referenceAssets: Array<{ assetId: string }>;
      };
    }>(manualResponse);
    assert.equal(manualPayload.mode, "manual");
    assert.equal(manualPayload.generation, null);
    assert.equal(manualPayload.manualPackage.status, "ready");
    assert.equal(manualPayload.manualPackage.workflowSnapshot?.selectedSkillId, "SK05_JAPANESE_CATALOG");
    assert.deepEqual(
      manualPayload.manualPackage.referenceAssets.map((asset) => asset.assetId).sort(),
      [assetRows[0].id, assetRows[1].id, assetRows[2].id].sort()
    );
    assert.equal(listProjectGenerations({ projectId: project.id, limit: 50 }).length, historyBeforeManual);

    const text = JSON.stringify({ autoResult, manualPayload, persisted });
    assert.doesNotMatch(text, /sk-[A-Za-z0-9_-]{40,}|Authorization|[A-Z]:\\\\[A-Za-z]|storage[\\/]|rawProviderPayload/);
  } finally {
    await saveCurrentProjectState({ workflowSnapshot: workflowDraftToSnapshot(originalWorkflowState.workflow) });
    if (generationIds.length) {
      db.delete(generationImages).where(inArray(generationImages.generationId, generationIds.filter(Boolean))).run();
      db.delete(generations).where(inArray(generations.id, generationIds.filter(Boolean))).run();
    }
    db.delete(assets).where(inArray(assets.id, assetRows.map((row) => row.id))).run();
    await removeGeneratedFiles(generatedFileNames);
    if (previousOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAIKey;
    }
  }

  console.log("Skill execute tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


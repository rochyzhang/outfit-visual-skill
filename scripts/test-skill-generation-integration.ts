import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { inArray } from "drizzle-orm";
import { POST as importManualResult } from "@/app/api/results/import/route";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { buildManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { validateSelectedSkillInput } from "@/features/skill/skill-validation";
import { db } from "@/lib/db/client";
import { assets, generationImages, generations } from "@/lib/db/schema";
import { executeImageGenerationFromWorkflowSnapshot } from "@/lib/generation/generation-execution-service";
import { getProjectGenerationById } from "@/lib/generation/generation-repository";
import { createGenerationRevision, retryGeneration } from "@/lib/generation/revision-service";
import { ImageGenerationError, type ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { resolveGeneratedResultPath } from "@/lib/storage/generated-result-storage";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { Asset, OutfitSlotKey, WorkflowDraft } from "@/types/domain";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const pngBytes = Buffer.from(pngBase64, "base64");

function testAsset(projectId: string, id: string): Asset {
  return {
    id,
    type: "product",
    fileName: `${id}.png`,
    originalFileName: `${id}.png`,
    relativePath: `uploads/${id}.png`,
    publicUrl: `/uploads/${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 1000,
    height: 1200,
    createdAt: new Date().toISOString()
  };
}

function workflow(projectId: string, skillId: WorkflowDraft["selectedSkillId"], slotIds: OutfitSlotKey[], providerId: WorkflowDraft["output"]["providerId"] = "openai"): WorkflowDraft {
  const draft = createDefaultWorkflowState();
  const outfitSlots: WorkflowDraft["outfitSlots"] = { ...draft.outfitSlots };

  slotIds.forEach((slotId) => {
    outfitSlots[slotId] = testAsset(projectId, `${slotId}-${crypto.randomUUID()}`);
  });

  return {
    ...draft,
    selectedSkillId: skillId,
    outfitSlots,
    scene: {
      preset: "S01",
      reference: null,
      customPrompt: ""
    },
    composition: {
      preset: skillId === "SK03_LOOK_BREAKDOWN" ? "C05" : "C02",
      graphic: skillId === "SK03_LOOK_BREAKDOWN" ? "G01" : "None"
    },
    look: "L02",
    output: {
      providerId,
      aspectRatio: "3:4",
      count: 1,
      quality: "draft",
      mode: "single"
    }
  };
}

function insertWorkflowAssets(projectId: string, draft: WorkflowDraft) {
  Object.values(draft.outfitSlots)
    .filter((asset): asset is Asset => Boolean(asset))
    .forEach((asset) => {
      db.insert(assets)
        .values({
          ...asset,
          projectId
        })
        .run();
    });
}

function successAdapter(callCounter: { count: number }): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage() {
      callCounter.count += 1;
      return {
        providerId: "openai",
        model: "test-skill-generation-model",
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

function failingAdapter(): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage() {
      throw new ImageGenerationError("OPENAI_NETWORK_ERROR", "test retry source", 502);
    }
  };
}

async function jsonFromResponse(response: Response) {
  return (await response.json()) as { result?: { generationId?: string; fileName?: string; skillId?: string | null; skillName?: string | null } };
}

async function removeGeneratedFiles(fileNames: string[]) {
  await Promise.all(fileNames.map((fileName) => rm(resolveGeneratedResultPath(fileName), { force: true })));
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key-skill-integration";
  const project = await getCurrentProjectInfo();
  const generationIds: string[] = [];
  const assetIds: string[] = [];
  const generatedFileNames: string[] = [];

  try {
    const blockedDraft = workflow(project.id, "SK01_MINIMAL_FLAT_LAY", ["top", "bottom"]);
    insertWorkflowAssets(project.id, blockedDraft);
    assetIds.push(...Object.values(blockedDraft.outfitSlots).flatMap((asset) => (asset ? [asset.id] : [])));
    const blockedCalls = { count: 0 };
    const blockedId = `generation-${crypto.randomUUID()}`;

    await assert.rejects(
      () =>
        executeImageGenerationFromWorkflowSnapshot({
          generationId: blockedId,
          workflowSnapshot: workflowDraftToSnapshot(blockedDraft),
          adapters: { openai: successAdapter(blockedCalls) }
        }),
      (error: unknown) => error instanceof ImageGenerationError && error.code === "SKILL_VALIDATION_FAILED"
    );
    generationIds.push(blockedId);
    assert.equal(blockedCalls.count, 0);
    const blockedDetail = getProjectGenerationById({ projectId: project.id, generationId: blockedId });
    assert.ok(blockedDetail);
    assert.equal(blockedDetail.status, "error");
    assert.equal(blockedDetail.skillId, "SK01_MINIMAL_FLAT_LAY");
    assert.equal(blockedDetail.errorCode, "SKILL_VALIDATION_FAILED");
    assert.equal(blockedDetail.images.length, 0);

    const warningDraft = workflow(project.id, "SK04_PROP_STYLING", ["top", "bottom"]);
    insertWorkflowAssets(project.id, warningDraft);
    assetIds.push(...Object.values(warningDraft.outfitSlots).flatMap((asset) => (asset ? [asset.id] : [])));
    const warningConfig = buildGenerationConfig(warningDraft);
    const warningPlan = compileGenerationPlan(warningConfig);
    const warningQA = validateGenerationPlan(warningPlan, warningConfig);
    const warningValidation = validateSelectedSkillInput(warningDraft);
    const manualWarningPackage = buildManualGenerationPackage(warningConfig, warningPlan, warningQA, warningValidation.status === "skipped" ? undefined : warningValidation, workflowDraftToSnapshot(warningDraft));
    assert.equal(warningValidation.status, "warning");
    assert.notEqual(manualWarningPackage.status, "blocked");
    assert.equal(warningConfig.skillOrigin?.id, "SK04_PROP_STYLING");
    assert.equal(warningPlan.skillOrigin?.id, "SK04_PROP_STYLING");
    assert.doesNotMatch(warningPlan.finalPrompt, /SK04_PROP_STYLING|Prop Styling/);

    const warningCalls = { count: 0 };
    const warningId = `generation-${crypto.randomUUID()}`;
    const warningResult = await executeImageGenerationFromWorkflowSnapshot({
      generationId: warningId,
      workflowSnapshot: workflowDraftToSnapshot(warningDraft),
      adapters: { openai: successAdapter(warningCalls) }
    });
    generationIds.push(warningId);
    generatedFileNames.push(...warningResult.result.images.map((image) => image.fileName));
    assert.equal(warningCalls.count, 1);
    assert.equal(warningResult.result.source.skillOrigin?.id, "SK04_PROP_STYLING");
    assert.equal(getProjectGenerationById({ projectId: project.id, generationId: warningId })?.skillId, "SK04_PROP_STYLING");

    const manualDraft = workflow(project.id, "SK01_MINIMAL_FLAT_LAY", ["top", "bottom", "shoes"], "chatgpt_manual");
    insertWorkflowAssets(project.id, manualDraft);
    assetIds.push(...Object.values(manualDraft.outfitSlots).flatMap((asset) => (asset ? [asset.id] : [])));
    const manualFormData = new FormData();
    manualFormData.append("file", new File([pngBytes], "manual-skill-result.png", { type: "image/png" }));
    manualFormData.append("providerId", "chatgpt_manual");
    manualFormData.append("workflowSnapshot", JSON.stringify(workflowDraftToSnapshot(manualDraft)));
    const manualResponse = await importManualResult(new Request("http://localhost/api/results/import", { method: "POST", body: manualFormData }));
    assert.equal(manualResponse.status, 200);
    const manualPayload = await jsonFromResponse(manualResponse);
    assert.equal(manualPayload.result?.skillId, "SK01_MINIMAL_FLAT_LAY");
    assert.ok(manualPayload.result?.generationId);
    assert.ok(manualPayload.result.fileName);
    generationIds.push(manualPayload.result.generationId);
    generatedFileNames.push(manualPayload.result.fileName);
    assert.equal(getProjectGenerationById({ projectId: project.id, generationId: manualPayload.result.generationId })?.skillId, "SK01_MINIMAL_FLAT_LAY");

    const retrySourceDraft = workflow(project.id, "SK02_INVISIBLE_EDITORIAL", ["top", "bottom", "shoes"]);
    insertWorkflowAssets(project.id, retrySourceDraft);
    assetIds.push(...Object.values(retrySourceDraft.outfitSlots).flatMap((asset) => (asset ? [asset.id] : [])));
    const retrySourceId = `generation-${crypto.randomUUID()}`;
    await assert.rejects(() =>
      executeImageGenerationFromWorkflowSnapshot({
        generationId: retrySourceId,
        workflowSnapshot: workflowDraftToSnapshot(retrySourceDraft),
        adapters: { openai: failingAdapter() }
      })
    );
    generationIds.push(retrySourceId);
    const retryCalls = { count: 0 };
    const retry = await retryGeneration({ parentGenerationId: retrySourceId, adapters: { openai: successAdapter(retryCalls) } });
    assert.ok(retry.generationId);
    generationIds.push(retry.generationId);
    generatedFileNames.push(...retry.images.map((image) => image.fileName));
    assert.equal(retryCalls.count, 1);
    assert.equal(getProjectGenerationById({ projectId: project.id, generationId: retry.generationId })?.skillId, "SK02_INVISIBLE_EDITORIAL");

    const revisionParentId = warningId;
    const revisionCalls = { count: 0 };
    const revision = await createGenerationRevision({
      parentGenerationId: revisionParentId,
      revisionInput: {
        revisionTypes: ["pose"],
        revisionInstruction: "Keep everything else unchanged. Shift only the product arrangement slightly."
      },
      adapters: { openai: successAdapter(revisionCalls) }
    });
    assert.equal(revision.mode, "automatic");
    if (revision.mode === "automatic") {
      assert.ok(revision.result.generationId);
      generationIds.push(revision.result.generationId);
      generatedFileNames.push(...revision.result.images.map((image) => image.fileName));
      assert.equal(revision.result.source.skillOrigin?.id, "SK04_PROP_STYLING");
      assert.equal(getProjectGenerationById({ projectId: project.id, generationId: revision.result.generationId })?.skillId, "SK04_PROP_STYLING");
    }
    assert.equal(revisionCalls.count, 1);
  } finally {
    if (generationIds.length) {
      db.delete(generationImages).where(inArray(generationImages.generationId, generationIds.filter(Boolean))).run();
      db.delete(generations).where(inArray(generations.id, generationIds.filter(Boolean))).run();
    }
    if (assetIds.length) {
      db.delete(assets).where(inArray(assets.id, assetIds)).run();
    }
    await removeGeneratedFiles(generatedFileNames);
    if (previousOpenAIKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAIKey;
    }
  }

  console.log("Skill generation integration tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


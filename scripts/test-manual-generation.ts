import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { POST as importResultPost } from "@/app/api/results/import/route";
import { GET as resultGet } from "@/app/api/results/[fileName]/route";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { buildManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { db } from "@/lib/db/client";
import { generationImages, generations } from "@/lib/db/schema";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useManualGenerationStore } from "@/stores/manual-generation-store";
import { useProjectStore } from "@/stores/project-store";
import { createDefaultWorkflowState, useWorkflowStore } from "@/stores/workflow-store";
import type { Asset, WorkflowDraft } from "@/types/domain";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
const jpegBytes = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAABp//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8BP//Z",
  "base64"
);
const webpBytes = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AA/vuUAAA=", "base64");

const productAsset: Asset = {
  id: "manual-product-asset",
  type: "product",
  fileName: "product-manual-product-asset.png",
  originalFileName: "white-shirt.png",
  relativePath: "assets/product-manual-product-asset.png",
  publicUrl: "/api/assets/product-manual-product-asset.png",
  mimeType: "image/png",
  sizeBytes: 70,
  width: 1,
  height: 1,
  createdAt: "2026-08-26T00:00:00.000Z"
};

const sceneAsset: Asset = {
  id: "manual-scene-asset",
  type: "scene_reference",
  fileName: "scene_reference-manual-scene-asset.png",
  originalFileName: "concrete-room.png",
  relativePath: "assets/scene_reference-manual-scene-asset.png",
  publicUrl: "/api/assets/scene_reference-manual-scene-asset.png",
  mimeType: "image/png",
  sizeBytes: 70,
  width: 1,
  height: 1,
  createdAt: "2026-08-26T00:00:00.000Z"
};

function createWorkflow(): WorkflowDraft {
  return {
    ...createDefaultWorkflowState(),
    outfitSlots: {
      ...createDefaultWorkflowState().outfitSlots,
      top: productAsset
    },
    scene: {
      preset: "S06",
      reference: sceneAsset,
      customPrompt: "minimal concrete studio room"
    },
    composition: {
      preset: "C02",
      graphic: "None"
    },
    output: {
      providerId: "chatgpt_manual",
      aspectRatio: "3:4",
      count: 1,
      quality: "high",
      mode: "single"
    }
  };
}

function buildPackage(workflow: WorkflowDraft) {
  const config = buildGenerationConfig(workflow);
  const plan = compileGenerationPlan(config);
  const qa = validateGenerationPlan(plan, config);
  return {
    config,
    plan,
    qa,
    manualPackage: buildManualGenerationPackage(config, plan, qa)
  };
}

function requestWithFile(bytes: Buffer, name: string, type: string, providerId = "chatgpt_manual") {
  const formData = new FormData();
  formData.append("file", new File([new Uint8Array(bytes)], name, { type }));
  formData.append("providerId", providerId);
  formData.append("workflowSnapshot", JSON.stringify(workflowDraftToSnapshot(createWorkflow())));

  return new Request("http://localhost/api/results/import", {
    method: "POST",
    body: formData
  });
}

async function responseJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

async function importImage(bytes: Buffer, name: string, type: string) {
  const response = await importResultPost(requestWithFile(bytes, name, type));
  const payload = await responseJson(response);
  assert.equal(response.status, 200);
  const result = payload.result as {
    fileName: string;
    publicUrl: string;
    id: string;
    generationId: string;
    imageId: string;
    originalFileName: string;
    mimeType: string;
    width: number;
    height: number;
  };
  assert.match(result.publicUrl, /^\/api\/results\/manual-result-[0-9a-f-]+\.(jpg|png|webp)$/);
  assert.equal(result.originalFileName, name);

  const stored = await resultGet(new Request("http://localhost/api/results"), {
    params: Promise.resolve({ fileName: result.fileName })
  });
  assert.equal(stored.status, 200);
  assert.equal(stored.headers.get("Content-Type"), type);

  await rm(path.join(process.cwd(), "storage", "generated", result.fileName), { force: true });
  db.delete(generationImages).where(eq(generationImages.generationId, result.generationId)).run();
  db.delete(generations).where(eq(generations.id, result.generationId)).run();
  return result;
}

async function main() {
  const workflow = createWorkflow();
  const snapshotBefore = workflowDraftToSnapshot(workflow);
  const { manualPackage } = buildPackage(workflow);

  assert.equal(manualPackage.providerId, "chatgpt_manual");
  assert.equal(manualPackage.status, "ready");
  assert.equal(manualPackage.referenceAssets.length, 1);
  assert.equal(manualPackage.sceneReference?.originalFileName, "concrete-room.png");
  assert.match(manualPackage.finalPrompt, /minimal concrete studio room/);
  assert.doesNotMatch(manualPackage.fullPackageText, /blob:|[A-Z]:\\|data\/outfit-visual-studio\.db|storage\/assets\//);
  assert.doesNotMatch(manualPackage.fullPackageText, /manual-product-asset/);

  const warningQa = {
    ...manualPackage.promptQA,
    status: "warning" as const,
    issues: [
      {
        code: "NO_PRODUCTS" as const,
        severity: "warning" as const,
        message: "No uploaded product references are attached."
      }
    ],
    metrics: {
      ...manualPackage.promptQA.metrics,
      warningCount: 1,
      errorCount: 0
    }
  };
  assert.equal(
    buildManualGenerationPackage(buildGenerationConfig(workflow), compileGenerationPlan(buildGenerationConfig(workflow)), warningQa)
      .status,
    "warning"
  );

  const failQa = {
    ...manualPackage.promptQA,
    status: "fail" as const,
    issues: [
      {
        code: "EMPTY_REQUIRED_SECTION" as const,
        severity: "error" as const,
        message: "Required section missing."
      }
    ],
    metrics: {
      ...manualPackage.promptQA.metrics,
      errorCount: 1
    }
  };
  assert.equal(buildManualGenerationPackage(buildGenerationConfig(workflow), compileGenerationPlan(buildGenerationConfig(workflow)), failQa).status, "blocked");

  const passQa = {
    ...manualPackage.promptQA,
    status: "pass" as const,
    issues: [],
    metrics: {
      ...manualPackage.promptQA.metrics,
      warningCount: 0,
      errorCount: 0
    }
  };
  assert.equal(buildManualGenerationPackage(buildGenerationConfig(workflow), compileGenerationPlan(buildGenerationConfig(workflow)), passQa).status, "ready");

  useManualGenerationStore.getState().openPackage(manualPackage);
  assert.equal(useManualGenerationStore.getState().panelOpen, true);
  assert.equal(useManualGenerationStore.getState().package?.providerId, "chatgpt_manual");
  useManualGenerationStore.getState().markCopied("prompt");
  assert.equal(useManualGenerationStore.getState().lastCopied, "prompt");
  useManualGenerationStore.getState().markCopied("package");
  assert.equal(useManualGenerationStore.getState().lastCopied, "package");
  useManualGenerationStore.getState().clearCopied();
  assert.equal(useManualGenerationStore.getState().lastCopied, null);

  const invalid = await responseJson(await importResultPost(requestWithFile(Buffer.from("nope"), "bad.txt", "text/plain")));
  assert.equal((invalid.error as { message?: string } | undefined)?.message, "Use JPEG, PNG, or WebP images.");
  assert.doesNotMatch(JSON.stringify(invalid), /[A-Z]:\\|storage\/generated|data\/outfit-visual-studio\.db/);

  const invalidImage = await responseJson(await importResultPost(requestWithFile(Buffer.from("nope"), "bad.png", "image/png")));
  assert.equal((invalidImage.error as { message?: string } | undefined)?.message, "The imported result is not a valid image.");
  assert.doesNotMatch(JSON.stringify(invalidImage), /[A-Z]:\\|storage\/generated|data\/outfit-visual-studio\.db/);

  await importImage(pngBytes, "manual-result.png", "image/png");
  await importImage(jpegBytes, "manual-result.jpg", "image/jpeg");
  const webpResult = await importImage(webpBytes, "manual-result.webp", "image/webp");

  useProjectStore.setState({ saveState: "saved" });
  useWorkflowStore.setState(workflow);
  const saveStateBefore = useProjectStore.getState().saveState;
  useGenerationResultStore.getState().setSuccess({
    generationId: webpResult.generationId,
    imageId: webpResult.imageId,
    imageUrl: webpResult.publicUrl,
    providerId: "chatgpt_manual",
    model: undefined,
    originalFileName: webpResult.originalFileName,
    mimeType: webpResult.mimeType,
    width: webpResult.width,
    height: webpResult.height,
    durationMs: 0,
    aspectRatio: workflow.output.aspectRatio,
    quality: workflow.output.quality,
    compositionId: workflow.composition.preset,
    lookId: workflow.look
  });
  assert.equal(useGenerationResultStore.getState().status, "success");
  assert.equal(useGenerationResultStore.getState().providerId, "chatgpt_manual");
  assert.equal(useGenerationResultStore.getState().compositionId, workflow.composition.preset);
  assert.equal(useGenerationResultStore.getState().lookId, workflow.look);
  assert.equal(useGenerationResultStore.getState().aspectRatio, workflow.output.aspectRatio);
  assert.equal(useGenerationResultStore.getState().quality, workflow.output.quality);
  assert.equal(useProjectStore.getState().saveState, saveStateBefore);
  assert.deepEqual(workflowDraftToSnapshot(workflow), snapshotBefore);

  useWorkflowStore.getState().setGenerationProvider("gemini");
  assert.equal(useGenerationResultStore.getState().status, "success");
  assert.equal(useGenerationResultStore.getState().providerId, "chatgpt_manual");
  assert.equal(useGenerationResultStore.getState().compositionId, "C02");

  const replacementResult = await importImage(pngBytes, "replacement-result.png", "image/png");
  const snapshotBeforeReplace = workflowDraftToSnapshot(workflow);
  const saveStateBeforeReplace = useProjectStore.getState().saveState;
  useGenerationResultStore.getState().setSuccess({
    generationId: replacementResult.generationId,
    imageId: replacementResult.imageId,
    imageUrl: replacementResult.publicUrl,
    providerId: "chatgpt_manual",
    model: undefined,
    originalFileName: replacementResult.originalFileName,
    mimeType: replacementResult.mimeType,
    width: replacementResult.width,
    height: replacementResult.height,
    durationMs: 0,
    aspectRatio: workflow.output.aspectRatio,
    quality: workflow.output.quality,
    compositionId: workflow.composition.preset,
    lookId: workflow.look
  });
  assert.equal(useGenerationResultStore.getState().generationId, replacementResult.generationId);
  assert.equal(useGenerationResultStore.getState().originalFileName, "replacement-result.png");
  assert.deepEqual(workflowDraftToSnapshot(workflow), snapshotBeforeReplace);
  assert.equal(useProjectStore.getState().saveState, saveStateBeforeReplace);

  const resultModuleSource = readFileSync(path.join(process.cwd(), "src", "features", "generation", "result-module.tsx"), "utf8");
  assert.match(resultModuleSource, /Replace Result/);
  assert.match(resultModuleSource, /Clear Result/);
  assert.match(resultModuleSource, /scrollIntoView/);
  assert.match(resultModuleSource, /qualityLabel/);
  assert.doesNotMatch(resultModuleSource, new RegExp("assetId|relativePath|storage\\\\\\\\|storage/"));

  const manualPanelSource = readFileSync(path.join(process.cwd(), "src", "features", "generation", "manual-generation-panel.tsx"), "utf8");
  assert.match(manualPanelSource, /Prompt copied/);
  assert.match(manualPanelSource, /Package copied/);
  assert.match(manualPanelSource, /manual-actions-primary/);
  assert.match(manualPanelSource, /manual-reference-item-scene/);

  const snapshotBeforeClear = workflowDraftToSnapshot(workflow);
  const saveStateBeforeClear = useProjectStore.getState().saveState;
  useGenerationResultStore.getState().resetResult();
  assert.equal(useGenerationResultStore.getState().status, "empty");
  assert.deepEqual(workflowDraftToSnapshot(workflow), snapshotBeforeClear);
  assert.equal(useProjectStore.getState().saveState, saveStateBeforeClear);

  console.log("Manual generation package tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { writeAssetFile } from "@/lib/storage/asset-storage";
import { resolveGeneratedResultPath } from "@/lib/storage/generated-result-storage";
import { persistAssetForCurrentProject } from "@/lib/projects/project-repository";
import { db } from "@/lib/db/client";
import { assets, generationImages, generations } from "@/lib/db/schema";
import { createGenerationRevision, retryGeneration } from "@/lib/generation/revision-service";
import { executeImageGenerationFromWorkflowSnapshot } from "@/lib/generation/generation-execution-service";
import { getProjectGenerationById, listProjectGenerations } from "@/lib/generation/generation-repository";
import { ImageGenerationError, type ImageGenerationProviderAdapter, type ImageGenerationRequest } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import { useProjectStore } from "@/stores/project-store";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { Asset, WorkflowDraft } from "@/types/domain";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const pngBytes = Buffer.from(pngBase64, "base64");

function workflow(product: Asset, providerId: WorkflowDraft["output"]["providerId"] = "openai"): WorkflowDraft {
  return {
    ...createDefaultWorkflowState(),
    productFidelity: true,
    outfitSlots: {
      ...createDefaultWorkflowState().outfitSlots,
      top: product
    },
    scene: {
      preset: "S06",
      reference: null,
      customPrompt: "quiet white studio"
    },
    composition: {
      preset: "C02",
      graphic: "None"
    },
    look: "L01",
    output: {
      providerId,
      aspectRatio: "3:4",
      count: 1,
      quality: "draft",
      mode: "single"
    }
  };
}

function successAdapter(onRequest?: (request: ImageGenerationRequest) => void): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage(request) {
      onRequest?.(request);
      return {
        providerId: "openai",
        model: "test-revision-image-model",
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
      throw new ImageGenerationError("OPENAI_NETWORK_ERROR", "Unable to reach OpenAI. Check the server network or proxy and try again.", 502);
    }
  };
}

async function removeGeneratedFiles(fileNames: string[]) {
  await Promise.all(fileNames.map((fileName) => rm(resolveGeneratedResultPath(fileName), { force: true })));
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key-revision";
  const product = await persistAssetForCurrentProject(
    await writeAssetFile({
      assetType: "product",
      originalFileName: "jacket.png",
      mimeType: "image/png",
      buffer: pngBytes
    })
  );
  const project = await getCurrentProjectInfo();
  const generatedFileNames: string[] = [];
  const generationIds: string[] = [];

  try {
    assert.ok(Object.keys(generations).includes("parentGenerationId"));
    assert.ok(Object.keys(generations).includes("revisionType"));
    assert.ok(Object.keys(generations).includes("revisionInstruction"));

    const parentId = `generation-${crypto.randomUUID()}`;
    const parentRun = await executeImageGenerationFromWorkflowSnapshot({
      generationId: parentId,
      workflowSnapshot: workflowDraftToSnapshot(workflow(product)),
      adapters: { openai: successAdapter() }
    });
    generationIds.push(parentId);
    generatedFileNames.push(parentRun.result.images[0]?.fileName ?? "");
    const parent = getProjectGenerationById({ projectId: project.id, generationId: parentId });
    assert.ok(parent);
    assert.equal(parent.status, "success");
    assert.equal(parent.parentGenerationId, null);

    let capturedRevisionRoles: string[] = [];
    let capturedRevisionPrompt = "";
    const poseRevision = await createGenerationRevision({
      parentGenerationId: parentId,
      revisionInput: {
        revisionTypes: ["pose"],
        revisionInstruction: "Keep everything else unchanged. Change only the pose to a relaxed walking pose."
      },
      adapters: {
        openai: successAdapter((request) => {
          capturedRevisionRoles = request.referenceAssets.map((asset) => asset.role);
          capturedRevisionPrompt = request.generationPlan.finalPrompt;
        })
      }
    });
    assert.equal(poseRevision.mode, "automatic");
    generationIds.push(poseRevision.result.generationId ?? "");
    generatedFileNames.push(poseRevision.result.images[0]?.fileName ?? "");
    assert.deepEqual(capturedRevisionRoles, ["product", "parent_generation"]);
    assert.match(capturedRevisionPrompt, /\[14 REVISION\]/);
    assert.match(capturedRevisionPrompt, /Keep all unmentioned elements unchanged/);
    const poseChild = getProjectGenerationById({ projectId: project.id, generationId: poseRevision.result.generationId ?? "" });
    assert.ok(poseChild);
    assert.equal(poseChild.parentGenerationId, parentId);
    assert.equal(poseChild.revisionType, "pose");
    assert.equal(poseChild.compositionId, parent.compositionId);
    assert.equal(poseChild.lookId, parent.lookId);
    assert.equal(poseChild.workflowSnapshot.scene.presetId, parent.workflowSnapshot.scene.presetId);
    assert.equal(poseChild.referenceAssetIds.includes(product.id), true);

    let conflictAdapterCalled = false;
    await assert.rejects(
      () =>
        createGenerationRevision({
          parentGenerationId: parentId,
          revisionInput: {
            revisionTypes: ["pose"],
            revisionInstruction: "Change the jacket into a red leather jacket."
          },
          adapters: {
            openai: successAdapter(() => {
              conflictAdapterCalled = true;
            })
          }
        }),
      (error: unknown) => error instanceof ImageGenerationError && error.code === "PROMPT_QA_FAILED"
    );
    assert.equal(conflictAdapterCalled, false);
    const conflictChild = listProjectGenerations({ projectId: project.id, limit: 20 }).find(
      (item) => item.parentGenerationId === parentId && item.errorCode === "PROMPT_QA_FAILED"
    );
    assert.ok(conflictChild);
    generationIds.push(conflictChild.id);
    const unchangedParent = getProjectGenerationById({ projectId: project.id, generationId: parentId });
    assert.equal(unchangedParent?.status, "success");

    const failedParentId = `generation-${crypto.randomUUID()}`;
    await assert.rejects(() =>
      executeImageGenerationFromWorkflowSnapshot({
        generationId: failedParentId,
        workflowSnapshot: workflowDraftToSnapshot(workflow(product)),
        adapters: { openai: failingAdapter() }
      })
    );
    generationIds.push(failedParentId);
    const failedParentBefore = getProjectGenerationById({ projectId: project.id, generationId: failedParentId });
    assert.equal(failedParentBefore?.status, "error");
    const retry = await retryGeneration({
      parentGenerationId: failedParentId,
      adapters: { openai: successAdapter() }
    });
    generationIds.push(retry.generationId ?? "");
    generatedFileNames.push(retry.images[0]?.fileName ?? "");
    const retryChild = getProjectGenerationById({ projectId: project.id, generationId: retry.generationId ?? "" });
    assert.equal(retryChild?.parentGenerationId, failedParentId);
    assert.equal(retryChild?.revisionType, "retry");
    assert.ok(!retryChild?.promptQAIssues.some((item) => item.code === "EMPTY_REVISION"));
    assert.deepEqual(retryChild?.workflowSnapshot, failedParentBefore?.workflowSnapshot);
    assert.equal(getProjectGenerationById({ projectId: project.id, generationId: failedParentId })?.status, "error");

    const manualRevision = await createGenerationRevision({
      parentGenerationId: parentId,
      revisionInput: {
        revisionTypes: ["look"],
        revisionInstruction: "Keep everything else unchanged. Make the lighting softer.",
        providerOverride: "chatgpt_manual"
      }
    });
    assert.equal(manualRevision.mode, "manual");
    assert.match(manualRevision.manualPackage.fullPackageText, /ChatGPT Manual Revision Package/);
    assert.match(manualRevision.manualPackage.finalPrompt, /\[14 REVISION\]/);
    assert.equal(manualRevision.revisionContext.parentGenerationId, parentId);

    useProjectStore.setState({ saveState: "saved" });
    const saveStateBefore = useProjectStore.getState().saveState;
    const currentWorkflowSnapshot = workflowDraftToSnapshot(workflow(product, "gemini"));
    assert.notDeepEqual(currentWorkflowSnapshot, parent.workflowSnapshot);
    assert.equal(useProjectStore.getState().saveState, saveStateBefore);

    const history = listProjectGenerations({ projectId: project.id, limit: 20 });
    assert.ok(history.some((item) => item.revisionType === "pose"));
    assert.ok(history.some((item) => item.revisionType === "retry"));
    assert.doesNotMatch(JSON.stringify(history), /sk-[A-Za-z0-9]|Authorization|rawProviderPayload|[A-Z]:\\/);

    console.log("Generation revision tests passed.");
  } finally {
    if (generationIds.length) {
      db.delete(generationImages).where(inArray(generationImages.generationId, generationIds.filter(Boolean))).run();
      db.delete(generations).where(inArray(generations.id, generationIds.filter(Boolean))).run();
    }
    db.delete(assets).where(eq(assets.id, product.id)).run();
    await removeGeneratedFiles(generatedFileNames.filter(Boolean));
    await rm(path.join(process.cwd(), "storage", "assets", product.fileName), { force: true });

    if (previousOpenAIKey) {
      process.env.OPENAI_API_KEY = previousOpenAIKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


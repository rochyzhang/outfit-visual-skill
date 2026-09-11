import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { GET as getGenerationDetail } from "@/app/api/generations/[generationId]/route";
import { GET as getCurrentProjectGenerations } from "@/app/api/projects/current/generations/route";
import { POST as importManualResult } from "@/app/api/results/import/route";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { db } from "@/lib/db/client";
import { generationImages, generations, projects } from "@/lib/db/schema";
import {
  createGeneration,
  getProjectGenerationById,
  listProjectGenerations,
  markGenerationError,
} from "@/lib/generation/generation-repository";
import { executeImageGenerationFromWorkflowSnapshot } from "@/lib/generation/generation-execution-service";
import { ImageGenerationError, type ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { resolveGeneratedResultPath } from "@/lib/storage/generated-result-storage";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useProjectStore } from "@/stores/project-store";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { WorkflowDraft } from "@/types/domain";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const pngBytes = Buffer.from(pngBase64, "base64");

function workflow(providerId: WorkflowDraft["output"]["providerId"]): WorkflowDraft {
  return {
    ...createDefaultWorkflowState(),
    scene: {
      preset: "S06",
      reference: null,
      customPrompt: "quiet studio wall"
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

function successAdapter(): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage() {
      return {
        providerId: "openai",
        model: "test-persisted-image-model",
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

async function jsonFromResponse(response: Response) {
  return (await response.json()) as unknown;
}

function assertNoUnsafeData(value: unknown) {
  const text = JSON.stringify(value);
  assert.doesNotMatch(text, /sk-[A-Za-z0-9]|Authorization|rawProviderPayload|[A-Z]:\\|storage[\\/]generated/);
}

async function removeGeneratedFiles(fileNames: string[]) {
  await Promise.all(fileNames.map((fileName) => rm(resolveGeneratedResultPath(fileName), { force: true })));
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key-persistence";
  const project = await getCurrentProjectInfo();
  const generatedFileNames: string[] = [];
  const generationIds: string[] = [];
  const extraProjectId = `project-${crypto.randomUUID()}`;

  try {
    const schemaGenerationColumns = Object.keys(generations);
    const schemaImageColumns = Object.keys(generationImages);
    assert.ok(schemaGenerationColumns.includes("workflowSnapshotJson"));
    assert.ok(schemaGenerationColumns.includes("finalPrompt"));
    assert.ok(schemaImageColumns.includes("publicUrl"));

    const successId = `generation-${crypto.randomUUID()}`;
    const successResponse = await executeImageGenerationFromWorkflowSnapshot({
      generationId: successId,
      workflowSnapshot: workflowDraftToSnapshot(workflow("openai")),
      adapters: { openai: successAdapter() }
    });
    generationIds.push(successId);
    const successImage = successResponse.result.images[0];
    assert.equal(successResponse.result.generationId, successId);
    assert.equal(successResponse.result.providerId, "openai");
    assert.equal(successResponse.result.model, "test-persisted-image-model");
    assert.ok(successImage?.id);
    assert.equal(successImage?.mimeType, "image/png");
    generatedFileNames.push(successImage?.fileName ?? "");

    const successDetail = getProjectGenerationById({ projectId: project.id, generationId: successId });
    assert.ok(successDetail);
    assert.equal(successDetail.status, "success");
    assert.equal(successDetail.providerMode, "api");
    assert.equal(successDetail.generationType, "automatic");
    assert.equal(successDetail.images.length, 1);
    assert.equal(successDetail.images[0]?.publicUrl, successImage?.imageUrl);
    assert.equal(successDetail.workflowSnapshot.output.providerId, "openai");
    assert.equal(successDetail.referenceAssetIds.length, 0);
    assertNoUnsafeData(successDetail);

    const errorId = `generation-${crypto.randomUUID()}`;
    await assert.rejects(
      () =>
        executeImageGenerationFromWorkflowSnapshot({
          generationId: errorId,
          workflowSnapshot: workflowDraftToSnapshot(workflow("openai")),
          adapters: { openai: failingAdapter() }
        }),
      (error: unknown) => error instanceof ImageGenerationError && error.code === "OPENAI_NETWORK_ERROR"
    );
    generationIds.push(errorId);
    const errorDetail = getProjectGenerationById({ projectId: project.id, generationId: errorId });
    assert.ok(errorDetail);
    assert.equal(errorDetail.status, "error");
    assert.equal(errorDetail.errorCode, "OPENAI_NETWORK_ERROR");
    assert.equal(errorDetail.images.length, 0);
    assertNoUnsafeData(errorDetail);

    const manualFormData = new FormData();
    manualFormData.append("file", new File([pngBytes], "manual-result.png", { type: "image/png" }));
    manualFormData.append("providerId", "chatgpt_manual");
    manualFormData.append("workflowSnapshot", JSON.stringify(workflowDraftToSnapshot(workflow("chatgpt_manual"))));
    const manualResponse = await importManualResult(
      new Request("http://localhost/api/results/import", {
        method: "POST",
        body: manualFormData
      })
    );
    assert.equal(manualResponse.status, 200);
    const manualPayload = (await jsonFromResponse(manualResponse)) as {
      result?: { generationId?: string; imageId?: string; fileName?: string; publicUrl?: string };
    };
    assert.ok(manualPayload.result?.generationId);
    assert.ok(manualPayload.result.imageId);
    assert.ok(manualPayload.result.fileName);
    generationIds.push(manualPayload.result.generationId);
    generatedFileNames.push(manualPayload.result.fileName);
    const manualDetail = getProjectGenerationById({ projectId: project.id, generationId: manualPayload.result.generationId });
    assert.ok(manualDetail);
    assert.equal(manualDetail.providerId, "chatgpt_manual");
    assert.equal(manualDetail.providerMode, "manual");
    assert.equal(manualDetail.generationType, "manual_import");
    assert.equal(manualDetail.status, "success");
    assert.equal(manualDetail.model, null);
    assert.equal(manualDetail.images.length, 1);
    assertNoUnsafeData(manualDetail);

    db.insert(projects)
      .values({
        id: extraProjectId,
        name: "Other Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .run();
    const config = buildGenerationConfig(workflow("openai"));
    const plan = compileGenerationPlan(config);
    const qa = validateGenerationPlan(plan, config);
    const otherGenerationId = createGeneration({
      projectId: extraProjectId,
      provider: config.provider,
      generationType: "automatic",
      workflowSnapshot: workflowDraftToSnapshot(workflow("openai")),
      generationConfig: config,
      generationPlan: plan,
      promptQA: qa
    });
    markGenerationError({
      generationId: otherGenerationId,
      durationMs: 1,
      errorCode: "OPENAI_NETWORK_ERROR",
      errorMessage: "Unable to reach OpenAI. Check the server network or proxy and try again."
    });

    const summaries = listProjectGenerations({ projectId: project.id, limit: 20 });
    assert.equal(summaries.some((item) => item.id === otherGenerationId), false);
    assert.ok(summaries.find((item) => item.id === successId));
    assert.ok(summaries.find((item) => item.id === errorId));
    assert.ok(summaries.find((item) => item.id === manualPayload.result?.generationId));
    assert.deepEqual(
      summaries.map((item) => item.createdAt),
      [...summaries.map((item) => item.createdAt)].sort().reverse()
    );
    assertNoUnsafeData(summaries);

    const apiListResponse = await getCurrentProjectGenerations(new Request("http://localhost/api/projects/current/generations?limit=20"));
    assert.equal(apiListResponse.status, 200);
    assertNoUnsafeData(await jsonFromResponse(apiListResponse));

    const apiDetailResponse = await getGenerationDetail(new Request(`http://localhost/api/generations/${successId}`), {
      params: Promise.resolve({ generationId: successId })
    });
    assert.equal(apiDetailResponse.status, 200);
    assertNoUnsafeData(await jsonFromResponse(apiDetailResponse));

    const saveStateBefore = useProjectStore.getState().saveState;
    const snapshotBefore = workflowDraftToSnapshot(workflow("openai"));
    useGenerationResultStore.getState().resetResult();
    const hydrateCandidate = listProjectGenerations({ projectId: project.id, limit: 20 }).find((item) => item.status === "success" && item.image);
    assert.ok(hydrateCandidate?.image);
    useGenerationResultStore.getState().setSuccess({
      generationId: hydrateCandidate.id,
      imageId: hydrateCandidate.image.id,
      imageUrl: hydrateCandidate.image.publicUrl,
      providerId: hydrateCandidate.providerId,
      model: hydrateCandidate.model ?? undefined,
      originalFileName: hydrateCandidate.image.fileName,
      mimeType: hydrateCandidate.image.mimeType,
      width: hydrateCandidate.image.width,
      height: hydrateCandidate.image.height,
      durationMs: hydrateCandidate.durationMs ?? undefined,
      aspectRatio: hydrateCandidate.aspectRatio,
      quality: hydrateCandidate.quality,
      compositionId: hydrateCandidate.compositionId,
      lookId: hydrateCandidate.lookId
    });
    assert.equal(useGenerationResultStore.getState().status, "success");
    assert.deepEqual(workflowDraftToSnapshot(workflow("openai")), snapshotBefore);
    assert.equal(useProjectStore.getState().saveState, saveStateBefore);

    const promptQaId = `generation-${crypto.randomUUID()}`;
    const promptQaGenerationId = createGeneration({
      id: promptQaId,
      projectId: project.id,
      provider: config.provider,
      generationType: "automatic",
      workflowSnapshot: workflowDraftToSnapshot(workflow("openai")),
      generationConfig: config,
      generationPlan: plan,
      promptQA: {
        ...qa,
        status: "fail",
        issues: [
          {
            code: "EMPTY_REQUIRED_SECTION",
            severity: "error",
            message: "Required section missing."
          }
        ],
        metrics: {
          ...qa.metrics,
          errorCount: 1
        }
      }
    });
    generationIds.push(promptQaGenerationId);
    markGenerationError({
      generationId: promptQaGenerationId,
      durationMs: 1,
      errorCode: "PROMPT_QA_FAILED",
      errorMessage: "Prompt QA failed and blocked automatic generation."
    });
    const promptQaDetail = getProjectGenerationById({ projectId: project.id, generationId: promptQaGenerationId });
    assert.equal(promptQaDetail?.status, "error");
    assert.equal(promptQaDetail?.promptQAStatus, "fail");
    assert.equal(promptQaDetail?.errorCode, "PROMPT_QA_FAILED");

    console.log("Generation persistence tests passed.");
  } finally {
    const allGenerationIds = [...generationIds];
    const otherRows = db.select().from(generations).where(eq(generations.projectId, extraProjectId)).all();
    allGenerationIds.push(...otherRows.map((row) => row.id));

    if (allGenerationIds.length) {
      db.delete(generationImages).where(inArray(generationImages.generationId, allGenerationIds)).run();
      db.delete(generations).where(inArray(generations.id, allGenerationIds)).run();
    }

    db.delete(projects).where(and(eq(projects.id, extraProjectId), eq(projects.name, "Other Project"))).run();
    await removeGeneratedFiles(generatedFileNames.filter(Boolean));

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


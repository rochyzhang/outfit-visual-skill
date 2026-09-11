import assert from "node:assert/strict";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useProjectStore } from "@/stores/project-store";
import { createDefaultWorkflowState } from "@/stores/workflow-store";

const workflow = createDefaultWorkflowState();
const snapshotBefore = workflowDraftToSnapshot(workflow);
const projectSaveStateBefore = useProjectStore.getState().saveState;
const resultStore = useGenerationResultStore.getState();

resultStore.resetResult();
assert.equal(useGenerationResultStore.getState().status, "empty");

useGenerationResultStore.getState().setQueued({
  generationId: "dev-generation",
  aspectRatio: "3:4",
  quality: "high",
  compositionId: "C05",
  lookId: "L03"
});
assert.equal(useGenerationResultStore.getState().status, "queued");

useGenerationResultStore.getState().setGenerating({
  generationId: "dev-generation",
  aspectRatio: "3:4",
  quality: "high",
  compositionId: "C05",
  lookId: "L03"
});
assert.equal(useGenerationResultStore.getState().status, "generating");

useGenerationResultStore.getState().setSuccess({
  generationId: "dev-generation",
  imageUrl: "/development-result-preview.png",
  providerId: "openai",
  model: "test-image-model",
  originalFileName: "generated-result-dev.png",
  mimeType: "image/png",
  width: 1056,
  height: 1408,
  durationMs: 1234,
  aspectRatio: "3:4",
  quality: "high",
  compositionId: "C05",
  lookId: "L03"
});
assert.equal(useGenerationResultStore.getState().status, "success");
assert.equal(useGenerationResultStore.getState().imageUrl, "/development-result-preview.png");

useGenerationResultStore.getState().setError({
  generationId: "dev-generation",
  providerId: "openai",
  aspectRatio: "3:4",
  quality: "high",
  compositionId: "C05",
  lookId: "L03",
  errorCode: "DEV_ERROR",
  errorMessage: "Development preview error."
});
assert.equal(useGenerationResultStore.getState().status, "error");
assert.equal(useGenerationResultStore.getState().errorCode, "DEV_ERROR");
assert.equal(useGenerationResultStore.getState().previousSuccess?.imageUrl, "/development-result-preview.png");

useGenerationResultStore.getState().setSuccess({
  generationId: "previous-generation",
  imageUrl: "/previous-result.png",
  providerId: "openai",
  model: "test-image-model",
  originalFileName: "generated-result-previous.png",
  mimeType: "image/png",
  width: 1056,
  height: 1408,
  durationMs: 2200,
  aspectRatio: "3:4",
  quality: "standard",
  compositionId: "C02",
  lookId: "L01"
});
useGenerationResultStore.getState().setQueued({
  generationId: "new-generation",
  providerId: "openai",
  aspectRatio: "1:1",
  quality: "draft",
  compositionId: "C01",
  lookId: "L02"
});
assert.equal(useGenerationResultStore.getState().status, "queued");
assert.equal(useGenerationResultStore.getState().imageUrl, undefined);
assert.equal(useGenerationResultStore.getState().previousSuccess?.imageUrl, "/previous-result.png");
assert.equal(useGenerationResultStore.getState().providerId, "openai");

useGenerationResultStore.getState().setError({
  generationId: "new-generation",
  providerId: "openai",
  aspectRatio: "1:1",
  quality: "draft",
  compositionId: "C01",
  lookId: "L02",
  errorCode: "OPENAI_NETWORK_ERROR",
  errorMessage: "Unable to reach OpenAI. Check the server network or proxy and try again."
});
assert.equal(useGenerationResultStore.getState().status, "error");
assert.equal(useGenerationResultStore.getState().previousSuccess?.imageUrl, "/previous-result.png");

const snapshotAfter = workflowDraftToSnapshot(workflow);
assert.deepEqual(snapshotAfter, snapshotBefore);
assert.equal(useProjectStore.getState().saveState, projectSaveStateBefore);

console.log("Result module state tests passed.");

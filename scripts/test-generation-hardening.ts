import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { openAIImageGenerationConfig } from "@/config/openai-image-generation";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useProjectStore } from "@/stores/project-store";

async function main() {
  assert.equal(openAIImageGenerationConfig.requestTimeoutMs, Number(process.env.OPENAI_IMAGE_GENERATION_TIMEOUT_MS) || 180000);
  assert.equal(openAIImageGenerationConfig.maxReferenceImages, 16);
  assert.equal(openAIImageGenerationConfig.maxReferenceImageSizeBytes, 25 * 1024 * 1024);

  const generateModuleSource = await readFile(path.join(process.cwd(), "src", "features", "generation", "generate-module.tsx"), "utf8");
  assert.match(generateModuleSource, /inFlightGenerationIdRef/);
  assert.match(generateModuleSource, /if \(inFlightGenerationIdRef\.current \|\| generating\)/);
  assert.match(generateModuleSource, /disabled=\{generating\}/);
  assert.match(generateModuleSource, /JSON\.stringify\(\{ generationId, workflowSnapshot \}\)/);
  assert.doesNotMatch(generateModuleSource, /OPENAI_API_KEY|HTTPS_PROXY|HTTP_PROXY|gpt-image/);

  const routeSource = await readFile(path.join(process.cwd(), "src", "app", "api", "generate", "route.ts"), "utf8");
  assert.match(routeSource, /activeGenerationRequests/);
  assert.match(routeSource, /Generation request is already in progress/);
  assert.match(routeSource, /finally/);

  const adapterSource = await readFile(
    path.join(process.cwd(), "src", "lib", "providers", "adapters", "openai-image-generation-adapter.ts"),
    "utf8"
  );
  assert.match(adapterSource, /OPENAI_IMAGE_GENERATION_TIMEOUT/);
  assert.match(adapterSource, /OPENAI_NETWORK_ERROR/);
  assert.match(adapterSource, /OPENAI_INVALID_IMAGE_REQUEST/);
  assert.match(adapterSource, /maxReferenceImages/);
  assert.match(adapterSource, /maxReferenceImageSizeBytes/);
  assert.match(adapterSource, /logOpenAIImageGenerationDiagnostic/);
  assert.doesNotMatch(adapterSource, /Authorization|apiKey|rawProviderPayload/);

  const projectSaveStateBefore = useProjectStore.getState().saveState;
  useGenerationResultStore.getState().resetResult();
  useGenerationResultStore.getState().setSuccess({
    generationId: "hardening-success",
    imageUrl: "/api/results/generated-result-hardening.png",
    providerId: "openai",
    model: "test-image-model",
    originalFileName: "generated-result-hardening.png",
    mimeType: "image/png",
    width: 1056,
    height: 1408,
    durationMs: 1500,
    aspectRatio: "3:4",
    quality: "standard",
    compositionId: "C02",
    lookId: "L01"
  });
  useGenerationResultStore.getState().setQueued({
    generationId: "hardening-next",
    providerId: "openai",
    aspectRatio: "1:1",
    quality: "high",
    compositionId: "C05",
    lookId: "L03"
  });
  assert.equal(useGenerationResultStore.getState().status, "queued");
  assert.equal(useGenerationResultStore.getState().previousSuccess?.imageUrl, "/api/results/generated-result-hardening.png");
  assert.equal(useGenerationResultStore.getState().aspectRatio, "1:1");
  assert.equal(useGenerationResultStore.getState().quality, "high");
  assert.equal(useProjectStore.getState().saveState, projectSaveStateBefore);

  useGenerationResultStore.getState().setError({
    generationId: "hardening-next",
    providerId: "openai",
    aspectRatio: "1:1",
    quality: "high",
    compositionId: "C05",
    lookId: "L03",
    errorCode: "OPENAI_NETWORK_ERROR",
    errorMessage: "Unable to reach OpenAI. Check the server network or proxy and try again."
  });
  assert.equal(useGenerationResultStore.getState().status, "error");
  assert.equal(useGenerationResultStore.getState().previousSuccess?.imageUrl, "/api/results/generated-result-hardening.png");
  assert.equal(useGenerationResultStore.getState().providerId, "openai");
  assert.equal(useProjectStore.getState().saveState, projectSaveStateBefore);

  console.log("Generation hardening tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

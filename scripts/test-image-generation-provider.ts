import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import type { PromptQAResult } from "@/features/prompt-compiler/prompt-qa-types";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import {
  buildImageGenerationRequest,
  executeImageGeneration
} from "@/lib/generation/generation-execution-service";
import { generateWithProvider } from "@/lib/generation/image-generation-dispatcher";
import { ImageGenerationError, type ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { resolveGeneratedResultPath } from "@/lib/storage/generated-result-storage";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import type { Asset, WorkflowDraft } from "@/types/domain";

const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const fakeOpenAIKey = "test-openai-key-image-generation-provider";

function asset(type: Asset["type"], originalFileName: string): Asset {
  const id = crypto.randomUUID();
  return {
    id,
    type,
    fileName: `${type}-${crypto.randomUUID()}.png`,
    originalFileName,
    relativePath: `../../${originalFileName}`,
    publicUrl: `/api/assets/${type}-${id}.png`,
    mimeType: "image/png",
    sizeBytes: 70,
    width: 1,
    height: 1,
    createdAt: "2026-09-01T00:00:00.000Z"
  };
}

function workflow(providerId: WorkflowDraft["output"]["providerId"] = "openai"): WorkflowDraft {
  const product = asset("product", "shirt.png");
  const sceneReference = asset("scene_reference", "room.png");

  return {
    ...createDefaultWorkflowState(),
    outfitSlots: {
      ...createDefaultWorkflowState().outfitSlots,
      top: product
    },
    scene: {
      preset: "S06",
      reference: sceneReference,
      customPrompt: "quiet concrete room"
    },
    composition: {
      preset: "C02",
      graphic: "None"
    },
    output: {
      providerId,
      aspectRatio: "3:4",
      count: 1,
      quality: "high",
      mode: "single"
    }
  };
}

function build(providerId: WorkflowDraft["output"]["providerId"] = "openai") {
  const generationConfig = buildGenerationConfig(workflow(providerId));
  const generationPlan = compileGenerationPlan(generationConfig);
  const promptQA = validateGenerationPlan(generationPlan, generationConfig);
  const request = buildImageGenerationRequest({
    providerId: generationConfig.provider.value,
    generationConfig,
    generationPlan
  });

  return { generationConfig, generationPlan, promptQA, request };
}

function fakeAdapter(responseBase64 = pngBase64): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",
    async generateImage(request) {
      assert.equal(request.output.count, 1);
      assert.equal(request.referenceAssets.length, 2);
      return {
        providerId: "openai",
        model: "test-image-model",
        artifacts: [
          {
            mimeType: "image/png",
            data: {
              kind: "base64",
              value: responseBase64
            }
          }
        ],
        warnings: ["test warning"],
        providerMetadata: {
          rawProviderPayload: "TEST_SECRET_THAT_MUST_NOT_LEAK"
        }
      };
    }
  };
}

function qaWithStatus(base: PromptQAResult, status: PromptQAResult["status"]): PromptQAResult {
  if (status === "pass") {
    return {
      ...base,
      status,
      issues: [],
      metrics: {
        ...base.metrics,
        warningCount: 0,
        errorCount: 0
      }
    };
  }

  if (status === "warning") {
    return {
      ...base,
      status,
      issues: [
        {
          code: "NO_PRODUCTS",
          severity: "warning",
          message: "Warning is allowed."
        }
      ],
      metrics: {
        ...base.metrics,
        warningCount: 1,
        errorCount: 0
      }
    };
  }

  return {
    ...base,
    status,
    issues: [
      {
        code: "EMPTY_REQUIRED_SECTION",
        severity: "error",
        message: "Required section missing."
      }
    ],
    metrics: {
      ...base.metrics,
      errorCount: 1
    }
  };
}

async function expectImageGenerationError(code: string, action: () => Promise<unknown>) {
  await assert.rejects(
    action,
    (error: unknown) => error instanceof ImageGenerationError && error.code === code
  );
}

async function main() {
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  const previousSecretRoot = process.env.PROVIDER_SECRET_STORE_ROOT;
  const tempSecretRoot = await mkdtemp(path.join(os.tmpdir(), "outfit-image-generation-provider-secrets-"));
  process.env.PROVIDER_SECRET_STORE_ROOT = tempSecretRoot;

  try {
    const { generationConfig, generationPlan, promptQA, request } = build("openai");

    assert.equal(request.providerId, "openai");
    assert.equal(request.output.aspectRatio, "3:4");
    assert.equal(request.output.quality, "high");
    assert.equal(request.referenceAssets[0]?.role, "product");
    assert.equal(request.referenceAssets[1]?.role, "scene_reference");
    assert.doesNotMatch(JSON.stringify(request.referenceAssets), /\.\.|[A-Z]:\\|storage\/assets|rawProviderPayload/);
    assert.match(request.referenceAssets[0]?.serverFileReference ?? "", /^product-[0-9a-f-]{36}\.png$/);
    assert.match(request.referenceAssets[1]?.serverFileReference ?? "", /^scene_reference-[0-9a-f-]{36}\.png$/);

    const injectedWorkflow = workflow("openai");
    const injectedProduct = asset("product", "injected.png");
    injectedProduct.fileName = "..\\secret.png";
    injectedWorkflow.outfitSlots.top = injectedProduct;
    assert.throws(() => {
      const injectedConfig = buildGenerationConfig(injectedWorkflow);
      buildImageGenerationRequest({
        providerId: "openai",
        generationConfig: injectedConfig,
        generationPlan: compileGenerationPlan(injectedConfig)
      });
    });

    await expectImageGenerationError("MANUAL_PROVIDER_NOT_AUTOMATIC", async () => {
      const manual = build("chatgpt_manual");
      await generateWithProvider({ request: manual.request });
    });

    await expectImageGenerationError("PROVIDER_NOT_FOUND", async () => {
      await generateWithProvider({ request: { ...request, providerId: "not_real" as typeof request.providerId } });
    });

    await expectImageGenerationError("PROVIDER_NOT_AVAILABLE", async () => {
      await generateWithProvider({ request: { ...request, providerId: "stability" } });
    });

    delete process.env.OPENAI_API_KEY;
    await expectImageGenerationError("PROVIDER_CREDENTIAL_REQUIRED", async () => {
      await generateWithProvider({ request, adapters: { openai: fakeAdapter() } });
    });

    let adapterCalled = false;
    await expectImageGenerationError("PROMPT_QA_FAILED", async () => {
      await executeImageGeneration({
        generationConfig,
        generationPlan,
        promptQA: qaWithStatus(promptQA, "fail"),
        adapters: {
          openai: {
            providerId: "openai",
            async generateImage() {
              adapterCalled = true;
              return fakeAdapter().generateImage(request);
            }
          }
        }
      });
    });
    assert.equal(adapterCalled, false);

    process.env.OPENAI_API_KEY = fakeOpenAIKey;
    const result = await executeImageGeneration({
      generationConfig,
      generationPlan,
      promptQA: qaWithStatus(promptQA, "warning"),
      adapters: { openai: fakeAdapter() }
    });

    assert.equal(result.providerId, "openai");
    assert.equal(result.model, "test-image-model");
    assert.equal(result.source.compositionId, "C02");
    assert.equal(result.source.lookId, generationConfig.look.id);
    assert.equal(result.source.aspectRatio, "3:4");
    assert.equal(result.source.quality, "high");
    assert.equal(result.images.length, 1);
    assert.match(result.images[0]?.imageUrl ?? "", /^\/api\/results\/generated-result-[0-9a-f-]+\.png$/);
    assert.match(result.images[0]?.fileName ?? "", /^generated-result-[0-9a-f-]+\.png$/);
    assert.equal(result.images[0]?.mimeType, "image/png");
    assert.equal(result.images[0]?.width, 1);
    assert.equal(result.images[0]?.height, 1);
    assert.equal(result.warnings.includes("Warning is allowed."), true);
    assert.equal(result.warnings.includes("test warning"), true);
    assert.doesNotMatch(JSON.stringify(result), /rawProviderPayload|TEST_SECRET_THAT_MUST_NOT_LEAK|OPENAI_API_KEY|Authorization|[A-Z]:\\/);

    const storedPath = resolveGeneratedResultPath(result.images[0]?.fileName ?? "");
    assert.match(storedPath, /storage[\\/]generated[\\/]generated-result-[0-9a-f-]+\.png$/);
    await rm(storedPath, { force: true });

    await expectImageGenerationError("GENERATED_IMAGE_INVALID", async () => {
      await executeImageGeneration({
        generationConfig,
        generationPlan,
        promptQA: qaWithStatus(promptQA, "pass"),
        adapters: { openai: fakeAdapter("not-image-bytes") }
      });
    });

    await expectImageGenerationError("IMAGE_GENERATION_INVALID_RESPONSE", async () => {
      await executeImageGeneration({
        generationConfig,
        generationPlan,
        promptQA: qaWithStatus(promptQA, "pass"),
        adapters: {
          openai: {
            providerId: "openai",
            async generateImage() {
              return {
                providerId: "openai",
                model: "test-image-model",
                artifacts: [
                  {
                    mimeType: "image/png",
                    data: {
                      kind: "remote_url",
                      value: "https://provider.example/generated.png"
                    }
                  }
                ],
                warnings: []
              };
            }
          }
        }
      });
    });

    await expectImageGenerationError("IMAGE_GENERATION_REQUEST_FAILED", async () => {
      await generateWithProvider({
        request,
        adapters: {
          openai: {
            providerId: "openai",
            async generateImage() {
              throw new Error("provider failed with TEST_SECRET_VALUE and C:\\secret\\path");
            }
          }
        }
      });
    });

    const source = JSON.stringify(await import("@/lib/generation/image-generation-adapters"));
    assert.doesNotMatch(source, /fakeAdapter|test-image-model|pngBase64/);

    console.log("Image generation provider tests passed.");
  } finally {
    if (previousOpenAIKey) {
      process.env.OPENAI_API_KEY = previousOpenAIKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    if (previousSecretRoot) {
      process.env.PROVIDER_SECRET_STORE_ROOT = previousSecretRoot;
    } else {
      delete process.env.PROVIDER_SECRET_STORE_ROOT;
    }

    await rm(tempSecretRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { APIConnectionError, APIConnectionTimeoutError, BadRequestError, RateLimitError } from "openai";
import type { ImagesResponse } from "openai/resources/images";
import { writeAssetFile } from "@/lib/storage/asset-storage";
import { createOpenAIImageGenerationAdapter } from "@/lib/providers/adapters/openai-image-generation-adapter";
import { mapOpenAIImageQuality, mapOpenAIImageSize, openAIImageGenerationConfig } from "@/config/openai-image-generation";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { executeImageGeneration, buildImageGenerationRequest } from "@/lib/generation/generation-execution-service";
import { ImageGenerationError } from "@/lib/generation/image-generation-types";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import type { Asset, OutputCount, WorkflowDraft } from "@/types/domain";

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

function okImageResponse(): ImagesResponse {
  return {
    created: Math.floor(Date.now() / 1000),
    data: [
      {
        b64_json: pngBytes.toString("base64")
      }
    ],
    output_format: "png",
    quality: "medium",
    size: "1024x1536"
  };
}

async function storedAsset(type: Asset["type"], name: string) {
  return writeAssetFile({
    assetType: type,
    originalFileName: name,
    mimeType: "image/png",
    buffer: pngBytes
  });
}

function workflow(input: { providerId?: WorkflowDraft["output"]["providerId"]; product?: Asset; scene?: Asset; count?: OutputCount } = {}): WorkflowDraft {
  return {
    ...createDefaultWorkflowState(),
    outfitSlots: {
      ...createDefaultWorkflowState().outfitSlots,
      top: input.product ?? null
    },
    scene: {
      preset: "S06",
      reference: input.scene ?? null,
      customPrompt: "quiet concrete room"
    },
    composition: {
      preset: "C02",
      graphic: "None"
    },
    output: {
      providerId: input.providerId ?? "openai",
      aspectRatio: "3:4",
      count: input.count ?? 1,
      quality: "standard",
      mode: "single"
    }
  };
}

function build(input: Parameters<typeof workflow>[0] = {}) {
  const generationConfig = buildGenerationConfig(workflow(input));
  const generationPlan = compileGenerationPlan(generationConfig);
  const promptQA = validateGenerationPlan(generationPlan, generationConfig);
  const request = buildImageGenerationRequest({
    providerId: "openai",
    generationConfig,
    generationPlan
  });

  return { generationConfig, generationPlan, promptQA, request };
}

async function expectImageError(code: string, action: () => Promise<unknown>) {
  await assert.rejects(action, (error: unknown) => error instanceof ImageGenerationError && error.code === code);
}

async function main() {
  const product = await storedAsset("product", "product.png");
  const scene = await storedAsset("scene_reference", "scene.png");
  const generatedFiles: string[] = [];

  try {
    assert.equal(openAIImageGenerationConfig.model, process.env.OPENAI_IMAGE_GENERATION_MODEL?.trim() || "gpt-image-2");
    assert.equal(mapOpenAIImageSize("3:4"), "1024x1536");
    assert.equal(mapOpenAIImageSize("4:5"), "1024x1536");
    assert.equal(mapOpenAIImageSize("1:1"), "1024x1024");
    assert.equal(mapOpenAIImageSize("9:16"), "1024x1536");
    assert.equal(mapOpenAIImageQuality("draft"), "low");
    assert.equal(mapOpenAIImageQuality("standard"), "medium");
    assert.equal(mapOpenAIImageQuality("high"), "high");

    let capturedEditBody: Record<string, unknown> = {};
    const adapter = createOpenAIImageGenerationAdapter({
      async createClient() {
        return {
          images: {
            async edit(body) {
              capturedEditBody = { ...body };
              return okImageResponse();
            },
            async generate() {
              throw new Error("generate should not be used when references exist");
            }
          }
        };
      }
    });
    const built = build({ product, scene });
    const response = await adapter.generateImage(built.request);

    assert.equal(response.providerId, "openai");
    assert.equal(response.model, openAIImageGenerationConfig.model);
    assert.equal(response.artifacts[0]?.mimeType, "image/png");
    assert.equal(response.artifacts[0]?.data.kind, "base64");
    assert.equal(capturedEditBody.model, openAIImageGenerationConfig.model);
    assert.equal(capturedEditBody.prompt, built.generationPlan.finalPrompt);
    assert.equal(capturedEditBody.n, 1);
    assert.equal(capturedEditBody.size, "1024x1536");
    assert.equal(capturedEditBody.quality, "medium");
    assert.equal(capturedEditBody.output_format, "png");
    const imageInputs = capturedEditBody.image as Array<File> | undefined;
    assert.equal(imageInputs?.length, 2);
    assert.match(imageInputs?.[0]?.name ?? "", /^product-[0-9a-f-]{36}\.png$/);
    assert.match(imageInputs?.[1]?.name ?? "", /^scene_reference-[0-9a-f-]{36}\.png$/);

    let capturedGenerateBody: Record<string, unknown> = {};
    const textOnlyAdapter = createOpenAIImageGenerationAdapter({
      async createClient() {
        return {
          images: {
            async edit() {
              throw new Error("edit should not be used without references");
            },
            async generate(body) {
              capturedGenerateBody = { ...body };
              return okImageResponse();
            }
          }
        };
      }
    });
    await textOnlyAdapter.generateImage(build().request);
    assert.equal(capturedGenerateBody.moderation, "auto");
    assert.equal(capturedGenerateBody.model, openAIImageGenerationConfig.model);

    await expectImageError("IMAGE_COUNT_NOT_SUPPORTED_YET", async () => {
      await adapter.generateImage(build({ product, count: 2 }).request);
    });

    await expectImageError("OPENAI_REFERENCE_LIMIT_EXCEEDED", async () => {
      const tooMany = build({ product }).request;
      tooMany.referenceAssets = Array.from({ length: openAIImageGenerationConfig.maxReferenceImages + 1 }, (_, index) => ({
        ...tooMany.referenceAssets[0],
        assetId: `asset-${index}`
      }));
      await adapter.generateImage(tooMany);
    });

    await expectImageError("OPENAI_INVALID_IMAGE_REQUEST", async () => {
      const tooLong = build({ product }).request;
      tooLong.generationPlan.finalPrompt = "x".repeat(openAIImageGenerationConfig.maxPromptCharacters + 1);
      await adapter.generateImage(tooLong);
    });

    await expectImageError("OPENAI_INVALID_IMAGE_REQUEST", async () => {
      const invalidMime = build({ product }).request;
      invalidMime.referenceAssets[0] = {
        ...invalidMime.referenceAssets[0],
        mimeType: "image/gif"
      };
      await adapter.generateImage(invalidMime);
    });

    await expectImageError("OPENAI_RATE_LIMITED", async () => {
      await createOpenAIImageGenerationAdapter({
        async createClient() {
          return {
            images: {
              async edit() {
                throw new RateLimitError(429, {}, "rate limit with TEST_SECRET_VALUE", new Headers());
              },
              async generate() {
                throw new Error("unused");
              }
            }
          };
        }
      }).generateImage(build({ product }).request);
    });

    await expectImageError("OPENAI_INVALID_IMAGE_REQUEST", async () => {
      await createOpenAIImageGenerationAdapter({
        async createClient() {
          return {
            images: {
              async edit() {
                throw new BadRequestError(400, {}, "bad request with C:\\secret", new Headers());
              },
              async generate() {
                throw new Error("unused");
              }
            }
          };
        }
      }).generateImage(build({ product }).request);
    });

    await expectImageError("OPENAI_INVALID_IMAGE_REQUEST", async () => {
      await createOpenAIImageGenerationAdapter({
        async createClient() {
          return {
            images: {
              async edit() {
                throw Object.assign(new Error("bad request with redacted provider body"), {
                  status: 400,
                  code: "invalid_value",
                  type: "invalid_request_error",
                  requestID: "req_safe_image_400"
                });
              },
              async generate() {
                throw new Error("unused");
              }
            }
          };
        }
      }).generateImage(build({ product }).request);
    });

    await expectImageError("OPENAI_IMAGE_GENERATION_TIMEOUT", async () => {
      await createOpenAIImageGenerationAdapter({
        async createClient() {
          return {
            images: {
              async edit() {
                throw new APIConnectionTimeoutError();
              },
              async generate() {
                throw new Error("unused");
              }
            }
          };
        }
      }).generateImage(build({ product }).request);
    });

    await expectImageError("OPENAI_NETWORK_ERROR", async () => {
      await createOpenAIImageGenerationAdapter({
        async createClient() {
          return {
            images: {
              async edit() {
                throw new APIConnectionError({ message: "connect ECONNREFUSED C:\\secret" });
              },
              async generate() {
                throw new Error("unused");
              }
            }
          };
        }
      }).generateImage(build({ product }).request);
    });

    const result = await executeImageGeneration({
      generationConfig: built.generationConfig,
      generationPlan: built.generationPlan,
      promptQA: built.promptQA,
      adapters: { openai: adapter }
    });
    assert.equal(result.providerId, "openai");
    assert.equal(result.model, openAIImageGenerationConfig.model);
    assert.equal(result.source.compositionId, "C02");
    assert.equal(result.images[0]?.mimeType, "image/png");
    assert.match(result.images[0]?.imageUrl ?? "", /^\/api\/results\/generated-result-[0-9a-f-]+\.png$/);
    assert.doesNotMatch(JSON.stringify(result), /TEST_SECRET_VALUE|Authorization|rawProviderPayload|[A-Z]:\\/);
    generatedFiles.push(result.images[0]?.fileName ?? "");

    const generationUiSource = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(process.cwd(), "src", "features", "generation", "generate-module.tsx"), "utf8")
    );
    assert.match(generationUiSource, /fetch\("\/api\/generate"/);
    assert.doesNotMatch(generationUiSource, /from "openai"|OPENAI_API_KEY|gpt-image/);

    console.log("OpenAI image provider tests passed.");
  } finally {
    await Promise.all([
      rm(path.join(process.cwd(), "storage", "assets", product.fileName), { force: true }),
      rm(path.join(process.cwd(), "storage", "assets", scene.fileName), { force: true }),
      ...generatedFiles.map((fileName) => rm(path.join(process.cwd(), "storage", "generated", fileName), { force: true }))
    ]);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


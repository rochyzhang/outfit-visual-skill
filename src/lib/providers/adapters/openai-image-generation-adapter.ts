import { imageSize } from "image-size";
import { APIConnectionError, APIConnectionTimeoutError, APIError, BadRequestError, RateLimitError, toFile } from "openai";
import type { ImageEditParamsNonStreaming, ImageGenerateParamsNonStreaming, ImagesResponse } from "openai/resources/images";
import {
  mapOpenAIImageQuality,
  mapOpenAIImageSize,
  openAIImageGenerationConfig
} from "@/config/openai-image-generation";
import { isAcceptedImageMimeType } from "@/config/assets";
import { AssetStorageError, readStoredAsset } from "@/lib/storage/asset-storage";
import { GeneratedResultStorageError, readGeneratedResult } from "@/lib/storage/generated-result-storage";
import { createOpenAIClient } from "./openai-provider-adapter";
import { ImageGenerationError, type ImageGenerationProviderAdapter, type ImageGenerationRequest } from "@/lib/generation/image-generation-types";

interface OpenAIImageClientLike {
  images: {
    edit: (body: ImageEditParamsNonStreaming, options?: { timeout?: number }) => Promise<ImagesResponse>;
    generate: (body: ImageGenerateParamsNonStreaming, options?: { timeout?: number }) => Promise<ImagesResponse>;
  };
}

interface OpenAIImageGenerationAdapterDependencies {
  createClient: () => Promise<OpenAIImageClientLike>;
}

type OpenAIImageDiagnosticPhase =
  | "request_validation"
  | "reference_loading"
  | "multipart_form_data_construction"
  | "openai_images_edits_call"
  | "openai_images_generations_call"
  | "provider_response_parsing"
  | "generated_image_storage";

interface OpenAIErrorShape {
  status?: number;
  requestID?: string | null;
  code?: string | null;
  type?: string | null;
  message?: string | null;
}

interface OpenAIImageGenerationDiagnostic {
  provider: "openai";
  model: string;
  phase: OpenAIImageDiagnosticPhase | "response";
  endpoint: "images.edit" | "images.generate" | null;
  code?: ImageGenerationError["code"];
  status?: number;
  requestId?: string | null;
  providerCode?: string | null;
  providerType?: string | null;
  providerSafeMessage?: string;
  durationMs: number;
  referenceCount: number;
  referenceRoleCounts: Record<ImageGenerationRequest["referenceAssets"][number]["role"], number>;
  imageInputCount: number;
  outputSize?: string;
  quality?: string;
  outputFormat: string;
  success: boolean;
}

function assertOpenAIRequestSupported(request: ImageGenerationRequest) {
  if (request.output.count !== 1) {
    throw new ImageGenerationError("IMAGE_COUNT_NOT_SUPPORTED_YET", "OpenAI automatic generation currently supports one image per request.", 400);
  }

  if (request.referenceAssets.length > openAIImageGenerationConfig.maxReferenceImages) {
    throw new ImageGenerationError(
      "OPENAI_REFERENCE_LIMIT_EXCEEDED",
      `Too many reference images for OpenAI image generation. Current count: ${request.referenceAssets.length}. Supported max: ${openAIImageGenerationConfig.maxReferenceImages}.`,
      400
    );
  }

  if (request.generationPlan.finalPrompt.length > openAIImageGenerationConfig.maxPromptCharacters) {
    throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "Generated prompt is too long for OpenAI image generation.", 400);
  }
}

function outputMimeType() {
  if (openAIImageGenerationConfig.outputFormat === "jpeg") {
    return "image/jpeg" as const;
  }

  if (openAIImageGenerationConfig.outputFormat === "webp") {
    return "image/webp" as const;
  }

  return "image/png" as const;
}

function referenceRoleCounts(request: ImageGenerationRequest) {
  return request.referenceAssets.reduce(
    (counts, asset) => ({
      ...counts,
      [asset.role]: counts[asset.role] + 1
    }),
    {
      product: 0,
      scene_reference: 0,
      parent_generation: 0,
      other_reference: 0
    } satisfies Record<ImageGenerationRequest["referenceAssets"][number]["role"], number>
  );
}

async function referenceFiles(request: ImageGenerationRequest) {
  return Promise.all(
    request.referenceAssets.map(async (asset) => {
      if (!isAcceptedImageMimeType(asset.mimeType)) {
        throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image MIME type is not supported by OpenAI generation.", 400);
      }

      let stored: Awaited<ReturnType<typeof readStoredAsset>>;

      try {
        stored =
          asset.role === "parent_generation"
            ? await readGeneratedResult(asset.serverFileReference)
            : await readStoredAsset(asset.serverFileReference);
      } catch (error) {
        if (error instanceof AssetStorageError || error instanceof GeneratedResultStorageError) {
          throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image file is missing or invalid.", 400);
        }

        throw error;
      }

      if (stored.contentType !== asset.mimeType || !isAcceptedImageMimeType(stored.contentType)) {
        throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image MIME type does not match the stored asset.", 400);
      }

      if (stored.sizeBytes > openAIImageGenerationConfig.maxReferenceImageSizeBytes) {
        throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image is too large for OpenAI generation.", 400);
      }

      try {
        const dimensions = imageSize(stored.bytes);
        if (!dimensions.width || !dimensions.height || dimensions.width !== asset.width || dimensions.height !== asset.height) {
          throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image has invalid dimensions.", 400);
        }
      } catch (error) {
        if (error instanceof ImageGenerationError) {
          throw error;
        }

        throw new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "A reference image file is not a valid image.", 400);
      }

      return toFile(stored.bytes, asset.serverFileReference, { type: stored.contentType });
    })
  );
}

function logOpenAIImageGenerationDiagnostic(input: {
  phase: OpenAIImageDiagnosticPhase | "response";
  endpoint: "images.edit" | "images.generate" | null;
  code?: ImageGenerationError["code"];
  status?: number;
  requestId?: string | null;
  providerCode?: string | null;
  providerType?: string | null;
  providerSafeMessage?: string;
  durationMs: number;
  referenceCount: number;
  referenceRoleCounts?: Record<ImageGenerationRequest["referenceAssets"][number]["role"], number>;
  imageInputCount?: number;
  outputSize?: string;
  quality?: string;
  outputFormat: string;
  success: boolean;
}) {
  const diagnostic = {
    provider: "openai",
    model: openAIImageGenerationConfig.model,
    ...input
  } satisfies Partial<OpenAIImageGenerationDiagnostic> & Pick<OpenAIImageGenerationDiagnostic, "provider" | "model">;

  console.warn(`OpenAI image generation diagnostic ${JSON.stringify(diagnostic)}`);
  return diagnostic;
}

function openAIErrorShape(error: unknown): OpenAIErrorShape | null {
  if (!(error instanceof Error) && (typeof error !== "object" || error === null)) {
    return null;
  }

  const candidate = error as Partial<OpenAIErrorShape>;
  return {
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    requestID: typeof candidate.requestID === "string" ? candidate.requestID : null,
    code: typeof candidate.code === "string" ? candidate.code : null,
    type: typeof candidate.type === "string" ? candidate.type : null,
    message: error instanceof Error ? error.message : null
  };
}

function safeProviderMessage(error: unknown, normalized: ImageGenerationError) {
  const apiError = openAIErrorShape(error);
  const message = apiError?.message?.trim();

  if (!message || /sk-[A-Za-z0-9_-]{12,}|Authori[z]ation|[A-Z]:\\|\/Users\/|\/home\/|base64|b64_json/i.test(message)) {
    return normalized.message;
  }

  return message.slice(0, 240);
}

function withDiagnostics(error: ImageGenerationError, diagnostics: Record<string, unknown>) {
  return new ImageGenerationError(error.code, error.message, error.status, diagnostics);
}

function normalizeOpenAIError(error: unknown): ImageGenerationError {
  if (error instanceof ImageGenerationError) {
    return error;
  }

  const apiError = openAIErrorShape(error);

  if (error instanceof RateLimitError) {
    return new ImageGenerationError(
      "OPENAI_RATE_LIMITED",
      "OpenAI image generation is currently unavailable because the API request was rate-limited or the account has insufficient API quota.",
      429
    );
  }

  if (error instanceof BadRequestError) {
    return new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "OpenAI rejected the image generation request.", 400);
  }

  if (error instanceof APIConnectionTimeoutError) {
    return new ImageGenerationError("OPENAI_IMAGE_GENERATION_TIMEOUT", "OpenAI image generation timed out. You can try again.", 504);
  }

  if (error instanceof APIConnectionError) {
    return new ImageGenerationError("OPENAI_NETWORK_ERROR", "Unable to reach OpenAI. Check the server network or proxy and try again.", 502);
  }

  if (error instanceof APIError || apiError?.status) {
    if (apiError?.status === 401) {
      return new ImageGenerationError("OPENAI_CREDENTIAL_REQUIRED", "OpenAI credential is missing or invalid.", 503);
    }

    if (apiError?.status === 403) {
      return new ImageGenerationError("OPENAI_PERMISSION_DENIED", "OpenAI project or account does not have permission for image generation.", 403);
    }

    if (apiError?.status === 404 || apiError?.code === "model_not_found") {
      return new ImageGenerationError("OPENAI_IMAGE_MODEL_UNAVAILABLE", "The configured OpenAI image model is not available.", 404);
    }

    if (apiError?.status === 429) {
      return new ImageGenerationError(
        "OPENAI_RATE_LIMITED",
        "OpenAI image generation is currently unavailable because the API request was rate-limited or the account has insufficient API quota.",
        429
      );
    }

    if (apiError?.status && apiError.status >= 500) {
      return new ImageGenerationError("OPENAI_UPSTREAM_ERROR", "OpenAI image generation returned a temporary server error.", 502);
    }

    if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
      return new ImageGenerationError("OPENAI_INVALID_IMAGE_REQUEST", "OpenAI rejected the image generation request.", apiError.status);
    }
  }

  return new ImageGenerationError("OPENAI_IMAGE_REQUEST_FAILED", "OpenAI image generation request failed.", 502);
}

function normalizeResponseData(input: { b64_json?: string; url?: string } | undefined) {
  if (!input) {
    throw new ImageGenerationError("OPENAI_INVALID_IMAGE_RESPONSE", "OpenAI image response was empty.", 502);
  }

  if (input.b64_json) {
    return {
      kind: "base64" as const,
      value: input.b64_json
    };
  }

  if (input.url) {
    return {
      kind: "remote_url" as const,
      value: input.url
    };
  }

  throw new ImageGenerationError("OPENAI_INVALID_IMAGE_RESPONSE", "OpenAI image response did not include image data.", 502);
}

export function createOpenAIImageGenerationAdapter(
  dependencies: OpenAIImageGenerationAdapterDependencies = {
    createClient: async () => (await createOpenAIClient()) as unknown as OpenAIImageClientLike
  }
): ImageGenerationProviderAdapter {
  return {
    providerId: "openai",

    async generateImage(request) {
      const startedAt = Date.now();
      const roleCounts = referenceRoleCounts(request);
      let endpoint: "images.edit" | "images.generate" | null = null;
      let imageInputCount = 0;
      let size: ReturnType<typeof mapOpenAIImageSize> | undefined;
      let quality: ReturnType<typeof mapOpenAIImageQuality> | undefined;

      try {
        assertOpenAIRequestSupported(request);
      } catch (error) {
        const normalized = normalizeOpenAIError(error);
        const diagnostic = logOpenAIImageGenerationDiagnostic({
          phase: "request_validation",
          endpoint,
          code: normalized.code,
          durationMs: Date.now() - startedAt,
          referenceCount: request.referenceAssets.length,
          referenceRoleCounts: roleCounts,
          imageInputCount,
          outputFormat: openAIImageGenerationConfig.outputFormat,
          success: false
        });
        throw withDiagnostics(normalized, diagnostic);
      }

      try {
        const client = await dependencies.createClient();
        size = mapOpenAIImageSize(request.output.aspectRatio);
        quality = mapOpenAIImageQuality(request.output.quality);
        const imageFiles = await referenceFiles(request);
        imageInputCount = imageFiles.length;
        const commonParams = {
          model: openAIImageGenerationConfig.model,
          prompt: request.generationPlan.finalPrompt,
          n: 1,
          size,
          quality,
          output_format: openAIImageGenerationConfig.outputFormat,
          background: "auto" as const,
          stream: false as const
        };
        const options = { timeout: openAIImageGenerationConfig.requestTimeoutMs };
        let response: ImagesResponse;

        if (imageFiles.length) {
          endpoint = "images.edit";
          response = await client.images.edit(
            {
              ...commonParams,
              image: imageFiles
            },
            options
          );
        } else {
          endpoint = "images.generate";
          response = await client.images.generate(
            {
              ...commonParams,
              moderation: "auto"
            },
            options
          );
        }

        const artifact = response.data?.[0];
        const outputSize = typeof (response as { size?: unknown }).size === "string" ? (response as { size: string }).size : size;

        logOpenAIImageGenerationDiagnostic({
          phase: "response",
          endpoint,
          durationMs: Date.now() - startedAt,
          referenceCount: imageFiles.length,
          referenceRoleCounts: roleCounts,
          imageInputCount,
          outputSize,
          quality,
          outputFormat: openAIImageGenerationConfig.outputFormat,
          success: true
        });

        return {
          providerId: "openai",
          model: openAIImageGenerationConfig.model,
          artifacts: [
            {
              mimeType: outputMimeType(),
              data: normalizeResponseData(artifact)
            }
          ],
          warnings: []
        };
      } catch (error) {
        const normalized = normalizeOpenAIError(error);
        const apiError = openAIErrorShape(error);
        const phase =
          error instanceof ImageGenerationError && endpoint
            ? "provider_response_parsing"
            : error instanceof ImageGenerationError
              ? "reference_loading"
              : endpoint === "images.edit"
              ? "openai_images_edits_call"
              : endpoint === "images.generate"
                ? "openai_images_generations_call"
                : "multipart_form_data_construction";
        const diagnostic = logOpenAIImageGenerationDiagnostic({
          phase,
          endpoint,
          code: normalized.code,
          status: apiError?.status,
          requestId: apiError?.requestID,
          providerCode: apiError?.code,
          providerType: apiError?.type,
          providerSafeMessage: safeProviderMessage(error, normalized),
          durationMs: Date.now() - startedAt,
          referenceCount: request.referenceAssets.length,
          referenceRoleCounts: roleCounts,
          imageInputCount,
          outputSize: size,
          quality,
          outputFormat: openAIImageGenerationConfig.outputFormat,
          success: false
        });
        throw withDiagnostics(normalized, diagnostic);
      }
    }
  };
}

export const openAIImageGenerationAdapter = createOpenAIImageGenerationAdapter();

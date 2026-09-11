import { getProviderDefinition } from "@/lib/providers/provider-registry";
import { getProviderStatus } from "@/lib/providers/provider-resolver";
import type { ProviderId } from "@/lib/providers/provider-types";
import { resolveImageGenerationAdapter } from "./image-generation-adapters";
import {
  ImageGenerationError,
  type ImageGenerationProviderAdapter,
  type ImageGenerationRequest,
  type ImageGenerationResponse
} from "./image-generation-types";

function normalizeUnknownProviderError(providerId: ProviderId) {
  const definition = getProviderDefinition(providerId);

  if (!definition) {
    throw new ImageGenerationError("PROVIDER_NOT_FOUND", "Provider is not supported.", 404);
  }

  return definition;
}

function validateProviderResponse(request: ImageGenerationRequest, response: ImageGenerationResponse) {
  if (response.providerId !== request.providerId) {
    throw new ImageGenerationError("IMAGE_GENERATION_INVALID_RESPONSE", "Provider response identity mismatch.", 502);
  }

  if (!response.model.trim()) {
    throw new ImageGenerationError("IMAGE_GENERATION_INVALID_RESPONSE", "Provider response model is missing.", 502);
  }

  if (!response.artifacts.length) {
    throw new ImageGenerationError("IMAGE_GENERATION_INVALID_RESPONSE", "Provider response did not include images.", 502);
  }

  return {
    providerId: response.providerId,
    model: response.model,
    artifacts: response.artifacts,
    warnings: response.warnings
  };
}

export async function generateWithProvider(input: {
  request: ImageGenerationRequest;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const definition = normalizeUnknownProviderError(input.request.providerId);

  if (definition.mode === "manual") {
    throw new ImageGenerationError("MANUAL_PROVIDER_NOT_AUTOMATIC", "Manual providers cannot run automatic generation.", 400);
  }

  if (!definition.implemented) {
    throw new ImageGenerationError("PROVIDER_NOT_AVAILABLE", "Provider is not available yet.", 503);
  }

  if (!definition.capabilities.imageGeneration) {
    throw new ImageGenerationError("IMAGE_GENERATION_NOT_SUPPORTED", "Provider does not support image generation.", 501);
  }

  const status = await getProviderStatus(input.request.providerId);

  if (!status.available) {
    throw new ImageGenerationError(
      status.supportsCredential ? "PROVIDER_CREDENTIAL_REQUIRED" : "PROVIDER_NOT_AVAILABLE",
      status.supportsCredential ? "Provider credential is required before automatic generation." : "Provider is not available.",
      503
    );
  }

  const adapter = resolveImageGenerationAdapter({
    providerId: input.request.providerId,
    adapters: input.adapters
  });

  try {
    return validateProviderResponse(input.request, await adapter.generateImage(input.request));
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw error;
    }

    throw new ImageGenerationError("IMAGE_GENERATION_REQUEST_FAILED", "Provider image generation request failed.", 502);
  }
}

import { openAIImageGenerationAdapter } from "@/lib/providers/adapters/openai-image-generation-adapter";
import type { ProviderId } from "@/lib/providers/provider-types";
import { ImageGenerationError, type ImageGenerationProviderAdapter } from "./image-generation-types";

function createPendingAdapter(providerId: Extract<ProviderId, "gemini">): ImageGenerationProviderAdapter {
  return {
    providerId,
    async generateImage() {
      throw new ImageGenerationError(
        "IMAGE_GENERATION_NOT_SUPPORTED",
        `${providerId} automatic image generation adapter is ready, but provider implementation is pending.`,
        501
      );
    }
  };
}

export const productionImageGenerationAdapters: Partial<Record<ProviderId, ImageGenerationProviderAdapter>> = {
  openai: openAIImageGenerationAdapter,
  gemini: createPendingAdapter("gemini")
};

export function resolveImageGenerationAdapter(input: {
  providerId: ProviderId;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const adapter = input.adapters?.[input.providerId] ?? productionImageGenerationAdapters[input.providerId];

  if (!adapter) {
    throw new ImageGenerationError(
      "IMAGE_GENERATION_NOT_SUPPORTED",
      "This provider does not have an automatic image generation adapter.",
      501
    );
  }

  if (adapter.providerId !== input.providerId) {
    throw new ImageGenerationError("IMAGE_GENERATION_INVALID_RESPONSE", "Provider adapter identity mismatch.", 500);
  }

  return adapter;
}
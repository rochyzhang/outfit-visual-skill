import type { AspectRatio, OutputQuality } from "@/types/domain";

export type OpenAIImageSize = `${number}x${number}`;
export type OpenAIImageQuality = "low" | "medium" | "high";
export type OpenAIImageOutputFormat = "png" | "jpeg" | "webp";

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const openAIImageGenerationConfig = {
  model: process.env.OPENAI_IMAGE_GENERATION_MODEL?.trim() || "gpt-image-2",
  outputFormat: "png" as OpenAIImageOutputFormat,
  maxReferenceImages: 16,
  maxReferenceImageSizeBytes: 25 * 1024 * 1024,
  maxPromptCharacters: 32000,
  requestTimeoutMs: envNumber("OPENAI_IMAGE_GENERATION_TIMEOUT_MS", 180000),
  docs: {
    apiPath: "/v1/images/edits for reference-image workflows; /v1/images/generations without references",
    source: "https://developers.openai.com/api/docs/guides/image-generation"
  }
};

export const openAIAspectRatioSizeMap = {
  "3:4": "1024x1536",
  "4:5": "1024x1536",
  "1:1": "1024x1024",
  "9:16": "1024x1536"
} satisfies Record<AspectRatio, OpenAIImageSize>;

export const openAIQualityMap = {
  draft: "low",
  standard: "medium",
  high: "high"
} satisfies Record<OutputQuality, OpenAIImageQuality>;

export function mapOpenAIImageSize(aspectRatio: AspectRatio) {
  return openAIAspectRatioSizeMap[aspectRatio];
}

export function mapOpenAIImageQuality(quality: OutputQuality) {
  return openAIQualityMap[quality];
}

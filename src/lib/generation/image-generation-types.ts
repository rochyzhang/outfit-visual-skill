import type { AcceptedImageMimeType } from "@/config/assets";
import type { GenerationPlan } from "@/features/prompt-compiler/compiler-types";
import type { ProviderId } from "@/lib/providers/provider-types";
import type { WorkflowSkillId } from "@/config/skills";
import type { AspectRatio, CompositionPresetId, LookPresetId, OutputCount, OutputMode, OutputQuality } from "@/types/domain";

export type ImageGenerationErrorCode =
  | "PROVIDER_NOT_FOUND"
  | "PROVIDER_NOT_AVAILABLE"
  | "PROVIDER_CREDENTIAL_REQUIRED"
  | "OPENAI_CREDENTIAL_REQUIRED"
  | "OPENAI_IMAGE_REQUEST_FAILED"
  | "OPENAI_IMAGE_GENERATION_TIMEOUT"
  | "OPENAI_NETWORK_ERROR"
  | "OPENAI_RATE_LIMITED"
  | "OPENAI_INVALID_IMAGE_REQUEST"
  | "OPENAI_PERMISSION_DENIED"
  | "OPENAI_IMAGE_MODEL_UNAVAILABLE"
  | "OPENAI_UPSTREAM_ERROR"
  | "OPENAI_INVALID_IMAGE_RESPONSE"
  | "OPENAI_REFERENCE_LIMIT_EXCEEDED"
  | "IMAGE_COUNT_NOT_SUPPORTED_YET"
  | "IMAGE_GENERATION_NOT_SUPPORTED"
  | "MANUAL_PROVIDER_NOT_AUTOMATIC"
  | "IMAGE_GENERATION_REQUEST_FAILED"
  | "IMAGE_GENERATION_INVALID_RESPONSE"
  | "GENERATED_IMAGE_INVALID"
  | "GENERATED_IMAGE_STORAGE_FAILED"
  | "SKILL_VALIDATION_FAILED"
  | "PROMPT_QA_FAILED"
  | "GENERATION_NOT_FOUND"
  | "GENERATION_NOT_REVISIONABLE"
  | "EMPTY_REVISION"
  | "REVISION_SCOPE_CONFLICT"
  | "PARENT_IMAGE_NOT_FOUND"
  | "RETRY_NOT_ALLOWED";

export class ImageGenerationError extends Error {
  constructor(
    public readonly code: ImageGenerationErrorCode,
    message: string,
    public readonly status = 500,
    public readonly diagnostics: Record<string, unknown> | null = null
  ) {
    super(message);
  }
}

export type GenerationReferenceAssetRole = "product" | "scene_reference" | "parent_generation" | "other_reference";

export interface GenerationReferenceAsset {
  role: GenerationReferenceAssetRole;
  slot?: string;
  assetId: string;
  mimeType: string;
  width: number;
  height: number;
  serverFileReference: string;
}

export interface ImageGenerationRequest {
  providerId: ProviderId;
  generationPlan: GenerationPlan;
  referenceAssets: GenerationReferenceAsset[];
  output: {
    aspectRatio: AspectRatio;
    quality: OutputQuality;
    count: OutputCount;
    mode: OutputMode;
  };
}

export interface GeneratedImageArtifact {
  mimeType: AcceptedImageMimeType;
  data:
    | {
        kind: "base64";
        value: string;
      }
    | {
        kind: "remote_url";
        value: string;
      };
  width?: number;
  height?: number;
}

export interface ImageGenerationResponse {
  providerId: ProviderId;
  model: string;
  artifacts: GeneratedImageArtifact[];
  warnings: string[];
  providerMetadata?: Record<string, unknown>;
}

export interface GenerationExecutionImage {
  id?: string;
  imageUrl: string;
  fileName: string;
  mimeType: AcceptedImageMimeType;
  width: number;
  height: number;
}

export interface GenerationExecutionResult {
  generationId?: string;
  providerId: ProviderId;
  model: string;
  images: GenerationExecutionImage[];
  source: {
    compositionId: CompositionPresetId;
    lookId: LookPresetId;
    aspectRatio: AspectRatio;
    quality: OutputQuality;
    skillOrigin: {
      id: WorkflowSkillId;
      name: string;
    } | null;
  };
  warnings: string[];
  durationMs?: number;
}

export interface ImageGenerationProviderAdapter {
  providerId: ProviderId;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}

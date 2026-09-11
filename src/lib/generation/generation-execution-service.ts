import { isAcceptedImageMimeType } from "@/config/assets";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import type { GenerationPlan } from "@/features/prompt-compiler/compiler-types";
import type { PromptQAResult } from "@/features/prompt-compiler/prompt-qa-types";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { skillValidationCodes, validateSelectedSkillInput } from "@/features/skill/skill-validation";
import { getCurrentProjectAsset, getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { resolveStoredAssetPath } from "@/lib/storage/asset-storage";
import { GeneratedResultStorageError, writeGeneratedResultFile } from "@/lib/storage/generated-result-storage";
import { resolveWorkflowSnapshot, validateWorkflowSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { ProviderId } from "@/lib/providers/provider-types";
import type { Asset, GenerationConfig, WorkflowSnapshotV1 } from "@/types/domain";
import { generateWithProvider } from "./image-generation-dispatcher";
import {
  ImageGenerationError,
  type GeneratedImageArtifact,
  type GenerationExecutionResult,
  type GenerationReferenceAsset,
  type ImageGenerationProviderAdapter,
  type ImageGenerationRequest
} from "./image-generation-types";
import {
  addGenerationImage,
  createGeneration,
  markGenerationError,
  markGenerationSuccess
} from "./generation-repository";

function assertPromptQAPasses(promptQA: PromptQAResult) {
  if (promptQA.status !== "fail") {
    return;
  }

  throw new ImageGenerationError("PROMPT_QA_FAILED", "Prompt QA failed and blocked automatic generation.", 422);
}

function assertSafeAssetFileReference(asset: Pick<Asset, "fileName">) {
  resolveStoredAssetPath(asset.fileName);
  return asset.fileName;
}

export function buildImageGenerationRequest(input: {
  providerId: ProviderId;
  generationConfig: GenerationConfig;
  generationPlan: GenerationPlan;
  additionalReferenceAssets?: GenerationReferenceAsset[];
}): ImageGenerationRequest {
  const productReferences: GenerationReferenceAsset[] = input.generationConfig.products.map((product) => ({
    role: "product",
    slot: product.slot.key,
    assetId: product.assetId,
    mimeType: product.mimeType,
    width: product.width,
    height: product.height,
    serverFileReference: assertSafeAssetFileReference(product)
  }));
  const sceneReference = input.generationConfig.scene.reference
    ? [
        {
          role: "scene_reference" as const,
          assetId: input.generationConfig.scene.reference.id,
          mimeType: input.generationConfig.scene.reference.mimeType,
          width: input.generationConfig.scene.reference.width,
          height: input.generationConfig.scene.reference.height,
          serverFileReference: assertSafeAssetFileReference(input.generationConfig.scene.reference)
        }
      ]
    : [];

  return {
    providerId: input.providerId,
    generationPlan: input.generationPlan,
    referenceAssets: [...productReferences, ...(input.additionalReferenceAssets ?? []), ...sceneReference],
    output: {
      aspectRatio: input.generationConfig.output.aspectRatio.value,
      quality: input.generationConfig.output.quality.value,
      count: input.generationConfig.output.count.value,
      mode: input.generationConfig.output.mode.value
    }
  };
}

function decodeArtifactBytes(artifact: GeneratedImageArtifact) {
  if (artifact.data.kind === "remote_url") {
    throw new ImageGenerationError(
      "IMAGE_GENERATION_INVALID_RESPONSE",
      "Remote provider image URLs must be materialized before becoming result URLs.",
      502
    );
  }

  try {
    return Buffer.from(artifact.data.value, "base64");
  } catch {
    throw new ImageGenerationError("GENERATED_IMAGE_INVALID", "Generated image payload is invalid.", 502);
  }
}

async function materializeArtifact(artifact: GeneratedImageArtifact, index: number) {
  if (!isAcceptedImageMimeType(artifact.mimeType)) {
    throw new ImageGenerationError("GENERATED_IMAGE_INVALID", "Generated image MIME type is not supported.", 502);
  }

  try {
    const result = await writeGeneratedResultFile({
      originalFileName: `provider-generated-${index + 1}`,
      mimeType: artifact.mimeType,
      buffer: decodeArtifactBytes(artifact),
      fileNamePrefix: "generated-result"
    });

    return {
      imageUrl: result.publicUrl,
      fileName: result.fileName,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      throw error;
    }

    if (error instanceof GeneratedResultStorageError && error.code === "INVALID_IMAGE") {
      throw new ImageGenerationError("GENERATED_IMAGE_INVALID", "Generated image bytes are invalid.", 502);
    }

    throw new ImageGenerationError("GENERATED_IMAGE_STORAGE_FAILED", "Generated image could not be stored.", 500);
  }
}

function imageGenerationErrorFromUnknown(error: unknown) {
  if (error instanceof ImageGenerationError) {
    return error;
  }

  return new ImageGenerationError("IMAGE_GENERATION_REQUEST_FAILED", "Automatic image generation failed.", 500);
}

export async function executeImageGeneration(input: {
  generationConfig: GenerationConfig;
  generationPlan: GenerationPlan;
  promptQA: PromptQAResult;
  additionalReferenceAssets?: GenerationReferenceAsset[];
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}): Promise<GenerationExecutionResult> {
  const startedAt = Date.now();
  assertPromptQAPasses(input.promptQA);

  const request = buildImageGenerationRequest({
    providerId: input.generationConfig.provider.value,
    generationConfig: input.generationConfig,
    generationPlan: input.generationPlan,
    additionalReferenceAssets: input.additionalReferenceAssets
  });
  const response = await generateWithProvider({ request, adapters: input.adapters });
  const images = await Promise.all(response.artifacts.slice(0, request.output.count).map(materializeArtifact));

  return {
    providerId: response.providerId,
    model: response.model,
    images,
    source: {
      compositionId: input.generationConfig.composition.id,
      lookId: input.generationConfig.look.id,
      aspectRatio: request.output.aspectRatio,
      quality: request.output.quality,
      skillOrigin: input.generationConfig.skillOrigin
    },
    warnings: [...input.generationPlan.warnings, ...input.promptQA.issues.map((issue) => issue.message), ...response.warnings],
    durationMs: Date.now() - startedAt
  };
}

function referencedAssetIds(snapshot: WorkflowSnapshotV1) {
  return Array.from(
    new Set([
      ...Object.values(snapshot.outfitSlots).filter((assetId): assetId is string => typeof assetId === "string"),
      ...(snapshot.scene.sceneReferenceAssetId ? [snapshot.scene.sceneReferenceAssetId] : [])
    ])
  );
}

export async function resolveTrustedWorkflowForGeneration(workflowSnapshot: unknown) {
  const validation = validateWorkflowSnapshot(workflowSnapshot);
  const assetRows = await Promise.all(referencedAssetIds(validation.snapshot).map((assetId) => getCurrentProjectAsset(assetId)));
  const assetsById = new Map(assetRows.filter((asset): asset is Asset => Boolean(asset)).map((asset) => [asset.id, asset]));
  const resolved = resolveWorkflowSnapshot({ snapshot: validation.snapshot, assetsById });

  return {
    snapshot: validation.snapshot,
    workflow: resolved.workflow,
    warnings: [...validation.warnings, ...resolved.warnings]
  };
}

export async function executeImageGenerationFromWorkflowSnapshot(input: {
  workflowSnapshot: unknown;
  generationId?: string;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const startedAt = Date.now();
  const project = await getCurrentProjectInfo();
  const trustedWorkflow = await resolveTrustedWorkflowForGeneration(input.workflowSnapshot);
  const skillValidation = validateSelectedSkillInput(trustedWorkflow.workflow);
  const generationConfig = buildGenerationConfig(trustedWorkflow.workflow);
  const generationPlan = compileGenerationPlan(generationConfig);
  const promptQA = validateGenerationPlan(generationPlan, generationConfig);
  const generationId = createGeneration({
    id: input.generationId,
    projectId: project.id,
    provider: generationConfig.provider,
    generationType: "automatic",
    workflowSnapshot: trustedWorkflow.snapshot,
    generationConfig,
    generationPlan,
    promptQA
  });

  if (skillValidation.status === "fail") {
    const skillError = new ImageGenerationError(
      skillValidationCodes.validationFailed,
      "Skill validation failed and blocked generation.",
      422,
      { skillValidation }
    );
    markGenerationError({
      generationId,
      durationMs: Date.now() - startedAt,
      errorCode: skillError.code,
      errorMessage: skillError.message,
      errorDiagnostics: skillError.diagnostics
    });
    throw skillError;
  }

  let result: GenerationExecutionResult;

  try {
    result = await executeImageGeneration({
      generationConfig,
      generationPlan,
      promptQA,
      adapters: input.adapters
    });
  } catch (error) {
    const imageError = imageGenerationErrorFromUnknown(error);
    markGenerationError({
      generationId,
      durationMs: Date.now() - startedAt,
      errorCode: imageError.code,
      errorMessage: imageError.message,
      errorDiagnostics: imageError.diagnostics
    });
    throw imageError;
  }

  const images = result.images.map((image) => ({
    ...image,
    id: addGenerationImage({ generationId, image })
  }));
  markGenerationSuccess({
    generationId,
    model: result.model,
    durationMs: result.durationMs ?? Date.now() - startedAt
  });

  return {
    result: {
      ...result,
      generationId,
      images
    },
    warnings: trustedWorkflow.warnings
  };
}

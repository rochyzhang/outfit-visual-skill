import { buildManualGenerationPackage, type ManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import type { GenerationPlan, GenerationPlanRevision } from "@/features/prompt-compiler/compiler-types";
import type { PromptQAResult } from "@/features/prompt-compiler/prompt-qa-types";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { getGenerationProviderOption, type GenerationProviderId } from "@/config/generation-providers";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import {
  addGenerationImage,
  createGeneration,
  getProjectGenerationById,
  markGenerationError,
  markGenerationSuccess,
  type GenerationDetail,
  type RevisionType
} from "./generation-repository";
import {
  executeImageGeneration,
} from "./generation-execution-service";
import { ImageGenerationError, type GenerationReferenceAsset, type ImageGenerationProviderAdapter } from "./image-generation-types";
import type { GenerationConfig, WorkflowSnapshotV1 } from "@/types/domain";
import type { ProviderId } from "@/lib/providers/provider-types";

export const revisionTypes = ["scene", "composition", "look", "pose", "product", "output", "prompt"] as const;
export type CreativeRevisionType = (typeof revisionTypes)[number];

export interface RevisionRequestInput {
  revisionTypes: CreativeRevisionType[];
  revisionInstruction: string;
  providerOverride?: Extract<GenerationProviderId, "openai" | "chatgpt_manual">;
}

function promptQAFromDetail(parent: GenerationDetail): PromptQAResult {
  const warningCount = parent.promptQAIssues.filter((issue) => issue.severity === "warning").length;
  const errorCount = parent.promptQAIssues.filter((issue) => issue.severity === "error").length;

  return {
    status: parent.promptQAStatus,
    issues: parent.promptQAIssues,
    metrics: {
      promptLength: parent.finalPrompt.length,
      sectionCount: parent.finalPrompt.match(/\[\d{2} [^\]]+\]/g)?.length ?? 0,
      warningCount,
      errorCount
    }
  };
}

function revisionTypeFromInput(input: RevisionRequestInput): RevisionType {
  if (input.revisionTypes.length === 1) {
    return input.revisionTypes[0];
  }

  return "mixed";
}

function assertRevisionInput(input: RevisionRequestInput) {
  const instruction = input.revisionInstruction.trim();

  if (!input.revisionTypes.length && !instruction) {
    throw new ImageGenerationError("EMPTY_REVISION", "Choose a revision scope or add a revision instruction.", 400);
  }

  if (input.providerOverride && input.providerOverride !== "openai" && input.providerOverride !== "chatgpt_manual") {
    throw new ImageGenerationError("GENERATION_NOT_REVISIONABLE", "Selected revision provider is not supported.", 400);
  }
}

function revisionInstruction(input: RevisionRequestInput) {
  const instruction = input.revisionInstruction.trim();
  const scopeText = input.revisionTypes.length ? input.revisionTypes.join(", ") : "prompt";

  return instruction || `Keep everything else unchanged. Change only the selected ${scopeText} scope.`;
}

export function buildRevisionSnapshot(parent: GenerationDetail, input: RevisionRequestInput) {
  assertRevisionInput(input);

  const providerId = input.providerOverride ?? parent.providerId;
  if (providerId !== "openai" && providerId !== "chatgpt_manual") {
    throw new ImageGenerationError("GENERATION_NOT_REVISIONABLE", "Only OpenAI and ChatGPT Manual generations can be revised in V1.", 400);
  }

  const snapshot: WorkflowSnapshotV1 = {
    ...parent.workflowSnapshot,
    output: {
      ...parent.workflowSnapshot.output,
      providerId
    }
  };
  const revisionType = revisionTypeFromInput(input);
  const revision: GenerationPlanRevision = {
    parentGenerationId: parent.id,
    revisionType,
    instruction: revisionInstruction(input),
    preserveUnchanged: true
  };

  return {
    snapshot,
    revisionType,
    revisionInstruction: revision.instruction,
    revision
  };
}

function parentImageReference(parent: GenerationDetail): GenerationReferenceAsset {
  const image = parent.images[0];

  if (!image) {
    throw new ImageGenerationError("PARENT_IMAGE_NOT_FOUND", "Parent generation image was not found.", 404);
  }

  return {
    role: "parent_generation",
    assetId: image.id,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    serverFileReference: image.fileName
  };
}

async function executeAndPersistChild(input: {
  parent: GenerationDetail;
  generationType: "automatic";
  revisionType: RevisionType;
  revisionInstruction: string | null;
  generationConfig: GenerationConfig;
  generationPlan: GenerationPlan;
  promptQA: PromptQAResult;
  workflowSnapshot: WorkflowSnapshotV1;
  additionalReferenceAssets?: GenerationReferenceAsset[];
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const project = await getCurrentProjectInfo();
  const startedAt = Date.now();
  const generationId = createGeneration({
    projectId: project.id,
    parentGenerationId: input.parent.id,
    revisionType: input.revisionType,
    revisionInstruction: input.revisionInstruction,
    provider: input.generationConfig.provider,
    generationType: input.generationType,
    workflowSnapshot: input.workflowSnapshot,
    generationConfig: input.generationConfig,
    generationPlan: input.generationPlan,
    promptQA: input.promptQA
  });

  try {
    const result = await executeImageGeneration({
      generationConfig: input.generationConfig,
      generationPlan: input.generationPlan,
      promptQA: input.promptQA,
      additionalReferenceAssets: input.additionalReferenceAssets,
      adapters: input.adapters
    });
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
      ...result,
      generationId,
      images
    };
  } catch (error) {
    const imageError =
      error instanceof ImageGenerationError
        ? error
        : new ImageGenerationError("IMAGE_GENERATION_REQUEST_FAILED", "Generation request failed.", 500);
    markGenerationError({
      generationId,
      durationMs: Date.now() - startedAt,
      errorCode: imageError.code,
      errorMessage: imageError.message,
      errorDiagnostics: imageError.diagnostics
    });
    throw imageError;
  }
}

async function loadParent(generationId: string) {
  const project = await getCurrentProjectInfo();
  const parent = getProjectGenerationById({ projectId: project.id, generationId });

  if (!parent) {
    throw new ImageGenerationError("GENERATION_NOT_FOUND", "Generation was not found.", 404);
  }

  return parent;
}

export async function createGenerationRevision(input: {
  parentGenerationId: string;
  revisionInput: RevisionRequestInput;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}): Promise<
  | { mode: "automatic"; result: Awaited<ReturnType<typeof executeAndPersistChild>> }
  | { mode: "manual"; manualPackage: ManualGenerationPackage; revisionContext: { parentGenerationId: string; revisionType: RevisionType; revisionInstruction: string } }
> {
  const parent = await loadParent(input.parentGenerationId);

  if (parent.status !== "success") {
    throw new ImageGenerationError("GENERATION_NOT_REVISIONABLE", "Only successful generations can create creative revisions.", 400);
  }

  const revisionSnapshot = buildRevisionSnapshot(parent, input.revisionInput);
  const revisedConfig = {
    ...parent.generationConfig,
    provider: getGenerationProviderOption(revisionSnapshot.snapshot.output.providerId)
  } satisfies GenerationConfig;
  const generationPlan = compileGenerationPlan(revisedConfig, { revision: revisionSnapshot.revision });
  const promptQA = validateGenerationPlan(generationPlan, revisedConfig);

  if (revisionSnapshot.snapshot.output.providerId === "chatgpt_manual") {
    return {
      mode: "manual",
      manualPackage: buildManualGenerationPackage(revisedConfig, generationPlan, promptQA, undefined, revisionSnapshot.snapshot),
      revisionContext: {
        parentGenerationId: parent.id,
        revisionType: revisionSnapshot.revisionType,
        revisionInstruction: revisionSnapshot.revisionInstruction
      }
    };
  }

  return {
    mode: "automatic",
    result: await executeAndPersistChild({
      parent,
      generationType: "automatic",
      revisionType: revisionSnapshot.revisionType,
      revisionInstruction: revisionSnapshot.revisionInstruction,
      generationConfig: revisedConfig,
      generationPlan,
      promptQA,
      workflowSnapshot: revisionSnapshot.snapshot,
      additionalReferenceAssets: [parentImageReference(parent)],
      adapters: input.adapters
    })
  };
}

export async function retryGeneration(input: {
  parentGenerationId: string;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const parent = await loadParent(input.parentGenerationId);

  if (parent.status !== "error" || parent.providerId !== "openai") {
    throw new ImageGenerationError("RETRY_NOT_ALLOWED", "Only failed OpenAI automatic generations can be retried in V1.", 400);
  }

  return executeAndPersistChild({
    parent,
    generationType: "automatic",
    revisionType: "retry",
    revisionInstruction: null,
    generationConfig: parent.generationConfig,
    generationPlan: parent.generationPlan,
    promptQA: promptQAFromDetail(parent),
    workflowSnapshot: parent.workflowSnapshot,
    adapters: input.adapters
  });
}

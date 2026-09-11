import { z } from "zod";
import { inArray } from "drizzle-orm";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { buildManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import {
  skillValidationCodes,
  validateSelectedSkillInput,
  type SkillValidationResult
} from "@/features/skill/skill-validation";
import { db } from "@/lib/db/client";
import { assets } from "@/lib/db/schema";
import { executeImageGenerationFromWorkflowSnapshot } from "@/lib/generation/generation-execution-service";
import { ImageGenerationError, type ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import { contentTypes } from "@/config/content-types";
import { generationProviderOptions, type GenerationProviderId } from "@/config/generation-providers";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { aspectRatioOptions, qualityOptions } from "@/config/output-options";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { lookPresets } from "@/config/presets/looks";
import { scenePresets } from "@/config/presets/scenes";
import {
  getWorkflowSkill,
  isWorkflowSkillId,
  toWorkflowSkillManifest,
  type SkillOverrideKey,
  type WorkflowSkill,
  type WorkflowSkillId
} from "@/config/skills";
import type { ProviderId } from "@/lib/providers/provider-types";
import type {
  Asset,
  AssetType,
  AspectRatio,
  CompositionPresetId,
  ContentTypeId,
  GraphicPresetId,
  LookPresetId,
  OutfitSlotKey,
  OutputQuality,
  ScenePresetId,
  WorkflowDraft,
  WorkflowSnapshotV1
} from "@/types/domain";

export const skillApiErrorCodes = {
  skillNotFound: "SKILL_NOT_FOUND",
  invalidRequest: "SKILL_INVALID_REQUEST",
  invalidSlot: "SKILL_INVALID_SLOT",
  assetNotFound: "SKILL_ASSET_NOT_FOUND",
  assetProjectMismatch: "SKILL_ASSET_PROJECT_MISMATCH",
  invalidAssetBinding: "SKILL_INVALID_ASSET_BINDING",
  invalidSceneReference: "SKILL_INVALID_SCENE_REFERENCE",
  unsupportedOverride: "SKILL_UNSUPPORTED_OVERRIDE",
  promptQAFailed: "PROMPT_QA_FAILED"
} as const;

export interface SkillApiErrorBody {
  code: string;
  message: string;
  issues?: unknown[];
}

export class SkillApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: SkillApiErrorBody
  ) {
    super(error.message);
  }
}

const contentTypeValues = contentTypes.map((item) => item.id) as [ContentTypeId, ...ContentTypeId[]];
const scenePresetValues = scenePresets.map((item) => item.id) as [ScenePresetId, ...ScenePresetId[]];
const compositionPresetValues = compositionPresets.map((item) => item.id) as [CompositionPresetId, ...CompositionPresetId[]];
const graphicPresetValues = graphicPresets.map((item) => item.id) as [GraphicPresetId, ...GraphicPresetId[]];
const lookPresetValues = lookPresets.map((item) => item.id) as [LookPresetId, ...LookPresetId[]];
const aspectRatioValues = aspectRatioOptions.map((item) => item.value) as [AspectRatio, ...AspectRatio[]];
const qualityValues = qualityOptions.map((item) => item.value) as [OutputQuality, ...OutputQuality[]];
const providerValues = generationProviderOptions.map((item) => item.value) as [GenerationProviderId, ...GenerationProviderId[]];
const outfitSlotKeys = outfitSlotDefinitions.map((slot) => slot.key);
const outfitSlotKeySet = new Set<OutfitSlotKey>(outfitSlotKeys);
const allowedOverrideKeys = new Set<SkillOverrideKey>([
  "scenePresetId",
  "compositionPresetId",
  "graphicPresetId",
  "lookPresetId",
  "aspectRatio",
  "quality",
  "providerId",
  "notes"
]);

const assetIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) => !value.includes("..") && !/[\\/:]/.test(value) && !/^https?:/i.test(value), {
    message: "Asset binding must be an existing project asset ID."
  });

const overridesSchema = z
  .object({
    scenePresetId: z.enum(scenePresetValues).optional(),
    compositionPresetId: z.enum(compositionPresetValues).optional(),
    graphicPresetId: z.enum(graphicPresetValues).optional(),
    lookPresetId: z.enum(lookPresetValues).optional(),
    aspectRatio: z.enum(aspectRatioValues).optional(),
    quality: z.enum(qualityValues).optional(),
    providerId: z.enum(providerValues).optional(),
    notes: z.string().max(1000).optional()
  })
  .strict();

const skillExecutionRequestSchema = z
  .object({
    projectId: z.literal("current").optional(),
    contentType: z.enum(contentTypeValues).optional(),
    assetBindings: z.record(z.string(), assetIdSchema).default({}),
    sceneReferenceAssetId: assetIdSchema.nullable().optional(),
    overrides: overridesSchema.optional(),
    requestId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export type SkillExecutionRequest = z.infer<typeof skillExecutionRequestSchema>;

function apiError(status: number, code: string, message: string, issues?: unknown[]): never {
  throw new SkillApiError(status, { code, message, issues });
}

export function resolveSkillForApi(skillId: string): WorkflowSkill {
  if (!isWorkflowSkillId(skillId)) {
    apiError(404, skillApiErrorCodes.skillNotFound, "Skill not found.");
  }

  return getWorkflowSkill(skillId);
}

export function parseSkillExecutionRequest(input: unknown): SkillExecutionRequest {
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const overrides = typeof record.overrides === "object" && record.overrides !== null ? (record.overrides as Record<string, unknown>) : {};
  const unsupportedOverrideKeys = Object.keys(overrides).filter((key) => !allowedOverrideKeys.has(key as SkillOverrideKey));

  if (unsupportedOverrideKeys.length || "productFidelity" in overrides) {
    apiError(400, skillApiErrorCodes.unsupportedOverride, "Request includes an unsupported Skill override.", unsupportedOverrideKeys);
  }

  const parsed = skillExecutionRequestSchema.safeParse(input);

  if (!parsed.success) {
    const invalidAssetBinding = parsed.error.issues.some((issue) => issue.path.includes("assetBindings"));
    apiError(
      400,
      invalidAssetBinding ? skillApiErrorCodes.invalidAssetBinding : skillApiErrorCodes.invalidRequest,
      "Skill request is invalid.",
      parsed.error.issues
    );
  }

  const unknownSlots = Object.keys(parsed.data.assetBindings).filter((slotId) => !outfitSlotKeySet.has(slotId as OutfitSlotKey));
  if (unknownSlots.length) {
    apiError(400, skillApiErrorCodes.invalidSlot, "Request includes an unknown outfit slot.", unknownSlots);
  }

  return parsed.data;
}

function rowToAsset(row: typeof assets.$inferSelect): Asset {
  return {
    id: row.id,
    type: row.type as AssetType,
    fileName: row.fileName,
    originalFileName: row.originalFileName,
    relativePath: row.relativePath,
    publicUrl: row.publicUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt
  };
}

async function resolveAssetRows(projectId: string, assetIds: string[]) {
  if (!assetIds.length) {
    return new Map<string, typeof assets.$inferSelect>();
  }

  const rows = db.select().from(assets).where(inArray(assets.id, Array.from(new Set(assetIds)))).all();
  return new Map(rows.map((row) => [row.id, row]));
}

async function resolveSkillAssetBindings(input: {
  projectId: string;
  request: SkillExecutionRequest;
}): Promise<{
  outfitSlots: WorkflowDraft["outfitSlots"];
  sceneReference: Asset | null;
}> {
  const allAssetIds = [
    ...Object.values(input.request.assetBindings),
    ...(input.request.sceneReferenceAssetId ? [input.request.sceneReferenceAssetId] : [])
  ];
  const assetRows = await resolveAssetRows(input.projectId, allAssetIds);
  const outfitSlots = Object.fromEntries(outfitSlotKeys.map((slotId) => [slotId, null])) as WorkflowDraft["outfitSlots"];

  for (const [slotId, assetId] of Object.entries(input.request.assetBindings)) {
    const row = assetRows.get(assetId);

    if (!row) {
      apiError(404, skillApiErrorCodes.assetNotFound, "Asset was not found.");
    }

    if (row.projectId !== input.projectId) {
      apiError(403, skillApiErrorCodes.assetProjectMismatch, "Asset does not belong to the current project.");
    }

    if (row.type !== "product") {
      apiError(400, skillApiErrorCodes.invalidAssetBinding, "Outfit slot bindings must reference product assets.");
    }

    outfitSlots[slotId as OutfitSlotKey] = rowToAsset(row);
  }

  if (!input.request.sceneReferenceAssetId) {
    return {
      outfitSlots,
      sceneReference: null
    };
  }

  const sceneReferenceRow = assetRows.get(input.request.sceneReferenceAssetId);
  if (!sceneReferenceRow) {
    apiError(404, skillApiErrorCodes.invalidSceneReference, "Scene reference asset was not found.");
  }

  if (sceneReferenceRow.projectId !== input.projectId || sceneReferenceRow.type !== "scene_reference") {
    apiError(400, skillApiErrorCodes.invalidSceneReference, "Scene reference must be a current-project scene reference asset.");
  }

  return {
    outfitSlots,
    sceneReference: rowToAsset(sceneReferenceRow)
  };
}

export async function buildSkillExecutionWorkflow(input: {
  skill: WorkflowSkill;
  request: SkillExecutionRequest;
  projectId: string;
}): Promise<WorkflowDraft> {
  const contentType = input.request.contentType ?? input.skill.supportedContentTypes[0];

  if (!input.skill.supportedContentTypes.includes(contentType as Exclude<ContentTypeId, "couple">)) {
    apiError(400, skillApiErrorCodes.invalidRequest, "Content type is not supported by this Skill.");
  }

  const resolvedAssets = await resolveSkillAssetBindings({
    projectId: input.projectId,
    request: input.request
  });
  const overrides = input.request.overrides ?? {};
  const scenePresetId = overrides.scenePresetId ?? input.skill.defaults.scenePresetId;

  return {
    selectedSkillId: input.skill.id,
    contentType,
    productFidelity: input.skill.defaults.productFidelity,
    outfitSlots: resolvedAssets.outfitSlots,
    scene: {
      preset: scenePresetId,
      reference: resolvedAssets.sceneReference,
      customPrompt: scenePresetId === "S06" ? overrides.notes?.trim() ?? "" : ""
    },
    composition: {
      preset: overrides.compositionPresetId ?? input.skill.defaults.compositionPresetId,
      graphic: overrides.graphicPresetId ?? input.skill.defaults.graphicPresetId
    },
    look: overrides.lookPresetId ?? input.skill.defaults.lookPresetId,
    output: {
      providerId: overrides.providerId ?? "openai",
      aspectRatio: overrides.aspectRatio ?? input.skill.defaults.aspectRatio,
      count: 1,
      quality: overrides.quality ?? input.skill.defaults.quality,
      mode: input.skill.defaults.mode
    }
  };
}

export async function buildSkillExecutionSnapshot(input: {
  skill: WorkflowSkill;
  request: SkillExecutionRequest;
  projectId: string;
}): Promise<{
  workflow: WorkflowDraft;
  snapshot: WorkflowSnapshotV1;
}> {
  const workflow = await buildSkillExecutionWorkflow(input);

  return {
    workflow,
    snapshot: workflowDraftToSnapshot(workflow)
  };
}

export async function validateSkillApiRequest(input: {
  skillId: string;
  body: unknown;
}) {
  const project = await getCurrentProjectInfo();
  const skill = resolveSkillForApi(input.skillId);
  const request = parseSkillExecutionRequest(input.body);
  const execution = await buildSkillExecutionSnapshot({
    skill,
    request,
    projectId: project.id
  });

  return {
    skill,
    request,
    workflow: execution.workflow,
    snapshot: execution.snapshot,
    validation: validateSelectedSkillInput(execution.workflow)
  };
}

function promptQAError(promptQA: ReturnType<typeof validateGenerationPlan>): never {
  apiError(422, skillApiErrorCodes.promptQAFailed, "Prompt QA failed and blocked generation.", promptQA.issues);
}

function skillValidationError(validation: SkillValidationResult): never {
  apiError(422, skillValidationCodes.validationFailed, "Skill validation failed and blocked generation.", validation.issues);
}

function providerUnavailableError(providerId: GenerationProviderId): never {
  apiError(400, "PROVIDER_NOT_AVAILABLE", `${providerId} is not available for Skill execution.`);
}

export async function executeSkillApiRequest(input: {
  skillId: string;
  body: unknown;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}) {
  const validated = await validateSkillApiRequest({
    skillId: input.skillId,
    body: input.body
  });
  const skill = validated.skill;

  if (validated.validation.status === "fail") {
    skillValidationError(validated.validation);
  }

  const generationConfig = buildGenerationConfig(validated.workflow);
  const generationPlan = compileGenerationPlan(generationConfig);
  const promptQA = validateGenerationPlan(generationPlan, generationConfig);

  if (promptQA.status === "fail") {
    promptQAError(promptQA);
  }

  if (generationConfig.provider.value === "chatgpt_manual") {
    return {
      ok: true as const,
      mode: "manual" as const,
      skill: {
        id: skill.id,
        name: skill.name
      },
      generation: null,
      manualPackage: buildManualGenerationPackage(
        generationConfig,
        generationPlan,
        promptQA,
        validated.validation.status === "skipped" ? undefined : validated.validation,
        validated.snapshot
      )
    };
  }

  if (generationConfig.provider.value !== "openai") {
    providerUnavailableError(generationConfig.provider.value);
  }

  try {
    const execution = await executeImageGenerationFromWorkflowSnapshot({
      workflowSnapshot: validated.snapshot,
      adapters: input.adapters
    });
    const image = execution.result.images[0] ?? null;

    return {
      ok: true as const,
      mode: "automatic" as const,
      skill: {
        id: skill.id,
        name: skill.name
      },
      generation: {
        id: execution.result.generationId,
        status: "success" as const,
        providerId: execution.result.providerId,
        model: execution.result.model
      },
      result: image
        ? {
            imageUrl: image.imageUrl,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height
          }
        : null,
      warnings: execution.result.warnings
    };
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      const issues =
        error.code === skillValidationCodes.validationFailed &&
        error.diagnostics &&
        "skillValidation" in error.diagnostics &&
        typeof error.diagnostics.skillValidation === "object" &&
        error.diagnostics.skillValidation !== null &&
        "issues" in error.diagnostics.skillValidation &&
        Array.isArray(error.diagnostics.skillValidation.issues)
          ? error.diagnostics.skillValidation.issues
          : undefined;
      apiError(error.status, error.code, error.message, issues);
    }

    throw error;
  }
}

export function skillManifestForApi(skillId: WorkflowSkillId) {
  return toWorkflowSkillManifest(getWorkflowSkill(skillId));
}

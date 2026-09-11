import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { generationImages, generations } from "@/lib/db/schema";
import type { PromptQAResult } from "@/features/prompt-compiler/prompt-qa-types";
import type { GenerationPlan } from "@/features/prompt-compiler/compiler-types";
import type { GenerationProviderId } from "@/config/generation-providers";
import type { WorkflowSkillId } from "@/config/skills";
import type { ProviderDefinition } from "@/lib/providers/provider-types";
import type { GenerationExecutionImage } from "@/lib/generation/image-generation-types";
import type {
  AspectRatio,
  CompositionPresetId,
  GenerationConfig,
  LookPresetId,
  OutputCount,
  OutputQuality,
  WorkflowSnapshotV1
} from "@/types/domain";

export type PersistedGenerationStatus = "generating" | "success" | "error";
export type PersistedGenerationType = "automatic" | "manual_import";
export type RevisionType = "scene" | "composition" | "look" | "pose" | "product" | "output" | "prompt" | "mixed" | "retry";

export interface PersistedGenerationImage {
  id: string;
  generationId: string;
  fileName: string;
  relativePath: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface GenerationSummary {
  id: string;
  parentGenerationId: string | null;
  revisionType: RevisionType | null;
  revisionInstruction: string | null;
  skillId: WorkflowSkillId | null;
  skillName: string | null;
  providerId: GenerationProviderId;
  providerMode: ProviderDefinition["mode"];
  model: string | null;
  status: PersistedGenerationStatus;
  generationType: PersistedGenerationType;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorDiagnostics: Record<string, unknown> | null;
  compositionId: CompositionPresetId;
  lookId: LookPresetId;
  aspectRatio: AspectRatio;
  quality: OutputQuality;
  count: OutputCount;
  productFidelity: boolean;
  image: PersistedGenerationImage | null;
}

export interface GenerationDetail extends GenerationSummary {
  promptQAStatus: PromptQAResult["status"];
  promptQAIssues: PromptQAResult["issues"];
  finalPrompt: string;
  workflowSnapshot: WorkflowSnapshotV1;
  generationConfig: GenerationConfig;
  generationPlan: GenerationPlan;
  referenceAssetIds: string[];
  images: PersistedGenerationImage[];
}

export class GenerationRepositoryError extends Error {
  constructor(
    public readonly code: "GENERATION_RECORD_FAILED" | "GENERATION_LOAD_FAILED",
    message: string
  ) {
    super(message);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function parseJson<TValue>(value: string, fallback: TValue): TValue {
  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
}

function rowToImage(row: typeof generationImages.$inferSelect): PersistedGenerationImage {
  return {
    id: row.id,
    generationId: row.generationId,
    fileName: row.fileName,
    relativePath: row.relativePath,
    publicUrl: row.publicUrl,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt
  };
}

function firstImageForGeneration(generationId: string) {
  const image = db.select().from(generationImages).where(eq(generationImages.generationId, generationId)).limit(1).get();
  return image ? rowToImage(image) : null;
}

function rowToSummary(row: typeof generations.$inferSelect): GenerationSummary {
  return {
    id: row.id,
    parentGenerationId: row.parentGenerationId,
    revisionType: row.revisionType as RevisionType | null,
    revisionInstruction: row.revisionInstruction,
    skillId: row.skillId as WorkflowSkillId | null,
    skillName: row.skillName,
    providerId: row.providerId as GenerationProviderId,
    providerMode: row.providerMode as ProviderDefinition["mode"],
    model: row.model,
    status: row.status as PersistedGenerationStatus,
    generationType: row.generationType as PersistedGenerationType,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    durationMs: row.durationMs,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    errorDiagnostics: parseJson<Record<string, unknown> | null>(row.errorDiagnosticsJson ?? "null", null),
    compositionId: row.compositionId as CompositionPresetId,
    lookId: row.lookId as LookPresetId,
    aspectRatio: row.aspectRatio as AspectRatio,
    quality: row.quality as OutputQuality,
    count: row.count as OutputCount,
    productFidelity: row.productFidelity === "true",
    image: firstImageForGeneration(row.id)
  };
}

function referenceAssetIds(generationConfig: GenerationConfig) {
  return [
    ...generationConfig.products.map((product) => product.assetId),
    ...(generationConfig.scene.reference ? [generationConfig.scene.reference.id] : [])
  ];
}

export function createGeneration(input: {
  id?: string;
  projectId: string;
  provider: GenerationConfig["provider"];
  generationType: PersistedGenerationType;
  workflowSnapshot: WorkflowSnapshotV1;
  generationConfig: GenerationConfig;
  generationPlan: GenerationPlan;
  promptQA: PromptQAResult;
  parentGenerationId?: string | null;
  revisionType?: RevisionType | null;
  revisionInstruction?: string | null;
}) {
  try {
    const id = input.id ?? crypto.randomUUID();
    const refs = referenceAssetIds(input.generationConfig);

    db.insert(generations)
      .values({
        id,
        projectId: input.projectId,
        parentGenerationId: input.parentGenerationId ?? null,
        revisionType: input.revisionType ?? null,
        revisionInstruction: input.revisionInstruction ?? null,
        skillId: input.generationConfig.skillOrigin?.id ?? null,
        skillName: input.generationConfig.skillOrigin?.name ?? null,
        providerId: input.provider.value,
        providerMode: input.provider.mode,
        model: null,
        status: "generating",
        generationType: input.generationType,
        createdAt: nowIso(),
        completedAt: null,
        durationMs: null,
        errorCode: null,
        errorMessage: null,
        errorDiagnosticsJson: null,
        promptQAStatus: input.promptQA.status,
        promptQAIssuesJson: JSON.stringify(input.promptQA.issues),
        finalPrompt: input.generationPlan.finalPrompt,
        workflowSnapshotJson: JSON.stringify(input.workflowSnapshot),
        generationConfigJson: JSON.stringify(input.generationConfig),
        generationPlanJson: JSON.stringify(input.generationPlan),
        referenceAssetIdsJson: JSON.stringify(refs),
        compositionId: input.generationConfig.composition.id,
        lookId: input.generationConfig.look.id,
        aspectRatio: input.generationConfig.output.aspectRatio.value,
        quality: input.generationConfig.output.quality.value,
        count: input.generationConfig.output.count.value,
        productFidelity: String(input.generationConfig.productFidelity)
      })
      .run();

    return id;
  } catch {
    throw new GenerationRepositoryError("GENERATION_RECORD_FAILED", "Could not create generation record.");
  }
}

export function markGenerationSuccess(input: { generationId: string; model: string | null; durationMs: number }) {
  try {
    db.update(generations)
      .set({
        status: "success",
        model: input.model,
        completedAt: nowIso(),
        durationMs: input.durationMs,
        errorCode: null,
        errorMessage: null,
        errorDiagnosticsJson: null
      })
      .where(eq(generations.id, input.generationId))
      .run();
  } catch {
    throw new GenerationRepositoryError("GENERATION_RECORD_FAILED", "Could not update generation record.");
  }
}

export function markGenerationError(input: {
  generationId: string;
  durationMs: number;
  errorCode: string;
  errorMessage: string;
  errorDiagnostics?: Record<string, unknown> | null;
}) {
  try {
    db.update(generations)
      .set({
        status: "error",
        completedAt: nowIso(),
        durationMs: input.durationMs,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        errorDiagnosticsJson: input.errorDiagnostics ? JSON.stringify(input.errorDiagnostics) : null
      })
      .where(eq(generations.id, input.generationId))
      .run();
  } catch {
    throw new GenerationRepositoryError("GENERATION_RECORD_FAILED", "Could not update generation record.");
  }
}

export function addGenerationImage(input: { generationId: string; image: GenerationExecutionImage }) {
  try {
    const id = crypto.randomUUID();
    db.insert(generationImages)
      .values({
        id,
        generationId: input.generationId,
        fileName: input.image.fileName,
        relativePath: `generated/${input.image.fileName}`,
        publicUrl: input.image.imageUrl,
        mimeType: input.image.mimeType,
        width: input.image.width,
        height: input.image.height,
        createdAt: nowIso()
      })
      .run();
    return id;
  } catch {
    throw new GenerationRepositoryError("GENERATION_RECORD_FAILED", "Could not create generation image record.");
  }
}

export function listProjectGenerations(input: { projectId: string; limit?: number }) {
  try {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    return db
      .select()
      .from(generations)
      .where(eq(generations.projectId, input.projectId))
      .orderBy(desc(generations.createdAt), desc(generations.id))
      .limit(limit)
      .all()
      .map(rowToSummary);
  } catch {
    throw new GenerationRepositoryError("GENERATION_LOAD_FAILED", "Could not load generation history.");
  }
}

export function getProjectGenerationById(input: { projectId: string; generationId: string }): GenerationDetail | null {
  try {
    const row = db
      .select()
      .from(generations)
      .where(and(eq(generations.projectId, input.projectId), eq(generations.id, input.generationId)))
      .get();

    if (!row) {
      return null;
    }

    const images = db.select().from(generationImages).where(eq(generationImages.generationId, row.id)).all().map(rowToImage);
    const summary = rowToSummary(row);

    return {
      ...summary,
      image: images[0] ?? null,
      promptQAStatus: row.promptQAStatus as PromptQAResult["status"],
      promptQAIssues: parseJson<PromptQAResult["issues"]>(row.promptQAIssuesJson, []),
      finalPrompt: row.finalPrompt,
      workflowSnapshot: parseJson<WorkflowSnapshotV1>(row.workflowSnapshotJson, {} as WorkflowSnapshotV1),
      generationConfig: parseJson<GenerationConfig>(row.generationConfigJson, {} as GenerationConfig),
      generationPlan: parseJson<GenerationPlan>(row.generationPlanJson, {} as GenerationPlan),
      referenceAssetIds: parseJson<string[]>(row.referenceAssetIdsJson, []),
      images
    };
  } catch {
    throw new GenerationRepositoryError("GENERATION_LOAD_FAILED", "Could not load generation detail.");
  }
}

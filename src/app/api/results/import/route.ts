import { NextResponse } from "next/server";
import { isAcceptedImageMimeType, maxImageSizeBytes } from "@/config/assets";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { addGenerationImage, createGeneration, getProjectGenerationById, markGenerationSuccess } from "@/lib/generation/generation-repository";
import { resolveTrustedWorkflowForGeneration } from "@/lib/generation/generation-execution-service";
import type { RevisionType } from "@/lib/generation/generation-repository";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";
import { GeneratedResultStorageError, writeGeneratedResultFile } from "@/lib/storage/generated-result-storage";

export const runtime = "nodejs";

type ImportResultErrorCode =
  | "NO_FILE"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_PROVIDER"
  | "INVALID_WORKFLOW_DATA"
  | "GENERATION_NOT_FOUND"
  | "INVALID_IMAGE"
  | "STORAGE_WRITE_FAILED";

function errorResponse(code: ImportResultErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function parseRevisionType(value: FormDataEntryValue | null): RevisionType | null {
  const allowed = new Set<RevisionType>(["scene", "composition", "look", "pose", "product", "output", "prompt", "mixed", "retry"]);
  return typeof value === "string" && allowed.has(value as RevisionType) ? (value as RevisionType) : null;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("NO_FILE", "Import must use multipart form data.", 400);
  }

  const file = formData.get("file");
  const providerId = formData.get("providerId");
  const workflowSnapshotInput = formData.get("workflowSnapshot");
  const parentGenerationId = formData.get("parentGenerationId");
  const revisionType = formData.get("revisionType");
  const revisionInstruction = formData.get("revisionInstruction");

  if (!(file instanceof File)) {
    return errorResponse("NO_FILE", "Choose an image file to import.", 400);
  }

  if (providerId !== "chatgpt_manual") {
    return errorResponse("INVALID_PROVIDER", "Only ChatGPT Manual result import is supported.", 400);
  }

  if (typeof workflowSnapshotInput !== "string") {
    return errorResponse("INVALID_WORKFLOW_DATA", "Manual import must include workflow snapshot.", 400);
  }

  if (!isAcceptedImageMimeType(file.type)) {
    return errorResponse("UNSUPPORTED_IMAGE_TYPE", "Use JPEG, PNG, or WebP images.", 415);
  }

  if (file.size > maxImageSizeBytes) {
    return errorResponse("IMAGE_TOO_LARGE", "Image must be 10 MB or smaller.", 413);
  }

  try {
    const project = await getCurrentProjectInfo();
    if (typeof parentGenerationId === "string" && !getProjectGenerationById({ projectId: project.id, generationId: parentGenerationId })) {
      return errorResponse("GENERATION_NOT_FOUND", "Parent generation was not found.", 404);
    }

    const trustedWorkflow = await resolveTrustedWorkflowForGeneration(JSON.parse(workflowSnapshotInput) as unknown);
    const generationConfig = buildGenerationConfig(trustedWorkflow.workflow);
    const generationPlan = compileGenerationPlan(generationConfig);
    const promptQA = validateGenerationPlan(generationPlan, generationConfig);
    const result = await writeGeneratedResultFile({
      originalFileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer())
    });
    const generationId = createGeneration({
      projectId: project.id,
      parentGenerationId: typeof parentGenerationId === "string" ? parentGenerationId : null,
      revisionType: parseRevisionType(revisionType),
      revisionInstruction: typeof revisionInstruction === "string" ? revisionInstruction : null,
      provider: generationConfig.provider,
      generationType: "manual_import",
      workflowSnapshot: trustedWorkflow.snapshot,
      generationConfig,
      generationPlan,
      promptQA
    });
    const imageId = addGenerationImage({
      generationId,
      image: {
        imageUrl: result.publicUrl,
        fileName: result.fileName,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height
      }
    });
    markGenerationSuccess({
      generationId,
      model: null,
      durationMs: 0
    });

    return NextResponse.json({
      result: {
        ...result,
        generationId,
        skillId: generationConfig.skillOrigin?.id ?? null,
        skillName: generationConfig.skillOrigin?.name ?? null,
        imageId
      }
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("INVALID_WORKFLOW_DATA", "Manual import workflow snapshot must be valid JSON.", 400);
    }

    if (error instanceof GeneratedResultStorageError && error.code === "INVALID_IMAGE") {
      return errorResponse("INVALID_IMAGE", error.message, 422);
    }

    return errorResponse("STORAGE_WRITE_FAILED", "Could not save imported result.", 500);
  }
}

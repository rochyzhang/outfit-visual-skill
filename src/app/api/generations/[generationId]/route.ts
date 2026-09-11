import { NextResponse } from "next/server";
import {
  GenerationRepositoryError,
  getProjectGenerationById
} from "@/lib/generation/generation-repository";
import { getCurrentProjectInfo, ProjectRepositoryError } from "@/lib/projects/project-repository";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ generationId: string }> }) {
  try {
    const { generationId } = await context.params;
    const project = await getCurrentProjectInfo();
    const generation = getProjectGenerationById({
      projectId: project.id,
      generationId
    });

    if (!generation) {
      return errorResponse("GENERATION_NOT_FOUND", "Generation was not found.", 404);
    }

    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof ProjectRepositoryError || error instanceof GenerationRepositoryError) {
      return errorResponse(error.code, error.message, 500);
    }

    return errorResponse("GENERATION_LOAD_FAILED", "Could not load generation detail.", 500);
  }
}

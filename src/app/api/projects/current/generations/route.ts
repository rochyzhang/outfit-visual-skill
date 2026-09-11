import { NextResponse } from "next/server";
import {
  GenerationRepositoryError,
  listProjectGenerations
} from "@/lib/generation/generation-repository";
import { getCurrentProjectInfo, ProjectRepositoryError } from "@/lib/projects/project-repository";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit"));
    const project = await getCurrentProjectInfo();
    const generations = listProjectGenerations({
      projectId: project.id,
      limit: Number.isFinite(limitParam) ? limitParam : undefined
    });

    return NextResponse.json({ generations });
  } catch (error) {
    if (error instanceof ProjectRepositoryError || error instanceof GenerationRepositoryError) {
      return errorResponse(error.code, error.message, 500);
    }

    return errorResponse("GENERATION_LOAD_FAILED", "Could not load generation history.", 500);
  }
}

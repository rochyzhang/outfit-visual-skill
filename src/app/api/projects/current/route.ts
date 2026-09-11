import { NextResponse } from "next/server";
import {
  getCurrentProjectState,
  ProjectRepositoryError,
  saveCurrentProjectState
} from "@/lib/projects/project-repository";
import { validateWorkflowSnapshot } from "@/lib/workflow/workflow-snapshot";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET() {
  try {
    const state = await getCurrentProjectState();
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof ProjectRepositoryError) {
      return errorResponse(error.code, error.message, 500);
    }

    return errorResponse("PROJECT_LOAD_FAILED", "Could not load current project.", 500);
  }
}

export async function PUT(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("INVALID_WORKFLOW_DATA", "Request body must be JSON.", 400);
  }

  if (typeof payload !== "object" || payload === null || !("workflowSnapshot" in payload)) {
    return errorResponse("INVALID_WORKFLOW_DATA", "Request must include workflowSnapshot.", 400);
  }

  const body = payload as { name?: unknown; workflowSnapshot?: unknown };
  const validation = validateWorkflowSnapshot(body.workflowSnapshot);

  try {
    const state = await saveCurrentProjectState({
      name: typeof body.name === "string" ? body.name : undefined,
      workflowSnapshot: validation.snapshot
    });

    return NextResponse.json({
      ...state,
      warnings: [...validation.warnings, ...state.warnings]
    });
  } catch (error) {
    if (error instanceof ProjectRepositoryError) {
      return errorResponse(error.code, error.message, error.code === "INVALID_WORKFLOW_DATA" ? 400 : 500);
    }

    return errorResponse("PROJECT_SAVE_FAILED", "Could not save current project.", 500);
  }
}

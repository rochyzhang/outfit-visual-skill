import { NextResponse } from "next/server";
import { executeImageGenerationFromWorkflowSnapshot } from "@/lib/generation/generation-execution-service";
import { ImageGenerationError } from "@/lib/generation/image-generation-types";

const activeGenerationRequests = new Set<string>();

function requestIdFromBody(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const generationId = (value as { generationId?: unknown }).generationId;
  return typeof generationId === "string" && generationId.trim() ? generationId : null;
}

export async function POST(request: Request) {
  let requestId: string | null = null;

  try {
    const body = (await request.json()) as { workflowSnapshot?: unknown };
    requestId = requestIdFromBody(body);

    if (requestId) {
      if (activeGenerationRequests.has(requestId)) {
        throw new ImageGenerationError("IMAGE_GENERATION_REQUEST_FAILED", "Generation request is already in progress.", 409);
      }

      activeGenerationRequests.add(requestId);
    }

    const execution = await executeImageGenerationFromWorkflowSnapshot({
      generationId: requestId ?? undefined,
      workflowSnapshot: body.workflowSnapshot
    });

    return NextResponse.json(execution);
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            diagnostics: error.diagnostics
          }
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "IMAGE_GENERATION_REQUEST_FAILED",
          message: "Automatic image generation failed."
        }
      },
      { status: 500 }
    );
  } finally {
    if (requestId) {
      activeGenerationRequests.delete(requestId);
    }
  }
}

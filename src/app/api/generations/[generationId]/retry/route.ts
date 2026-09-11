import { NextResponse } from "next/server";
import { retryGeneration } from "@/lib/generation/revision-service";
import { ImageGenerationError } from "@/lib/generation/image-generation-types";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(_request: Request, context: { params: Promise<{ generationId: string }> }) {
  try {
    const { generationId } = await context.params;
    const result = await retryGeneration({ parentGenerationId: generationId });
    return NextResponse.json({ mode: "automatic", result });
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return errorResponse(error.code, error.message, error.status);
    }

    return errorResponse("IMAGE_GENERATION_REQUEST_FAILED", "Could not retry generation.", 500);
  }
}

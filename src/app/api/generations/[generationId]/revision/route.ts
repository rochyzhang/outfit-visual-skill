import { NextResponse } from "next/server";
import { createGenerationRevision, revisionTypes, type CreativeRevisionType } from "@/lib/generation/revision-service";
import { ImageGenerationError } from "@/lib/generation/image-generation-types";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function parseRevisionTypes(value: unknown): CreativeRevisionType[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CreativeRevisionType => typeof item === "string" && revisionTypes.includes(item as CreativeRevisionType));
}

export async function POST(request: Request, context: { params: Promise<{ generationId: string }> }) {
  try {
    const { generationId } = await context.params;
    const body = (await request.json()) as {
      revisionTypes?: unknown;
      revisionInstruction?: unknown;
      providerOverride?: unknown;
    };
    const revision = await createGenerationRevision({
      parentGenerationId: generationId,
      revisionInput: {
        revisionTypes: parseRevisionTypes(body.revisionTypes),
        revisionInstruction: typeof body.revisionInstruction === "string" ? body.revisionInstruction : "",
        providerOverride:
          body.providerOverride === "openai" || body.providerOverride === "chatgpt_manual" ? body.providerOverride : undefined
      }
    });

    return NextResponse.json(revision);
  } catch (error) {
    if (error instanceof ImageGenerationError) {
      return errorResponse(error.code, error.message, error.status);
    }

    return errorResponse("IMAGE_GENERATION_REQUEST_FAILED", "Could not create revision.", 500);
  }
}

import { NextResponse } from "next/server";
import { getSafeAiMetadata } from "@/lib/openai/client";
import { aiErrorResponse, AiRouteError } from "@/lib/ai/errors";
import { refineCustomScenePrompt } from "@/lib/ai/prompt-intelligence";

export const runtime = "nodejs";

interface RefineSceneRequest {
  customPrompt?: unknown;
  contentType?: unknown;
}

export async function POST(request: Request) {
  let body: RefineSceneRequest;

  try {
    body = (await request.json()) as RefineSceneRequest;
  } catch {
    return await aiErrorResponse(new AiRouteError("EMPTY_CUSTOM_PROMPT", "Enter custom scene text before refining.", 400));
  }

  const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : undefined;

  try {
    const result = await refineCustomScenePrompt({ customPrompt, contentType });

    return NextResponse.json({
      result,
      ai: await getSafeAiMetadata()
    });
  } catch (error) {
    if (error instanceof AiRouteError) {
      return await aiErrorResponse(error);
    }

    return await aiErrorResponse(new AiRouteError("AI_REQUEST_FAILED", "AI assistance request failed.", 502));
  }
}

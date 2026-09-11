import { NextResponse } from "next/server";
import { getSafeAiMetadata } from "@/lib/openai/client";

export type AiErrorCode =
  | "OPENAI_API_KEY_MISSING"
  | "AI_REQUEST_FAILED"
  | "AI_INVALID_RESPONSE"
  | "EMPTY_CUSTOM_PROMPT"
  | "ASSET_NOT_FOUND"
  | "INVALID_SCENE_REFERENCE"
  | "UNSUPPORTED_REFERENCE_IMAGE";

export class AiRouteError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function aiErrorResponse(error: AiRouteError) {
  return getSafeAiMetadata().then((metadata) =>
    NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message
        },
        ai: metadata
      },
      { status: error.status }
    )
  );
}

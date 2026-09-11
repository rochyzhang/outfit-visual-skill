"use client";

import type { SceneReferenceAnalysisResult, SceneRefinementResult } from "@/features/ai/ai-schemas";

export type AiErrorCode =
  | "OPENAI_API_KEY_MISSING"
  | "AI_REQUEST_FAILED"
  | "AI_INVALID_RESPONSE"
  | "EMPTY_CUSTOM_PROMPT"
  | "ASSET_NOT_FOUND"
  | "INVALID_SCENE_REFERENCE"
  | "UNSUPPORTED_REFERENCE_IMAGE";

interface AiFailure {
  error: {
    code: AiErrorCode;
    message: string;
  };
  ai?: {
    available: boolean;
    model: string;
    source?: string;
  };
}

interface RefineSceneSuccess {
  result: SceneRefinementResult;
  ai: {
    available: boolean;
    model: string;
    source?: string;
  };
}

interface AnalyzeSceneReferenceSuccess {
  result: SceneReferenceAnalysisResult;
  ai: {
    available: boolean;
    model: string;
    source?: string;
  };
}

function isAiFailure(value: unknown): value is AiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.code === "string" &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.message === "string"
  );
}

function isRefineSceneSuccess(value: unknown): value is RefineSceneSuccess {
  return typeof value === "object" && value !== null && "result" in value && "ai" in value;
}

function isAnalyzeSceneReferenceSuccess(value: unknown): value is AnalyzeSceneReferenceSuccess {
  return typeof value === "object" && value !== null && "result" in value && "ai" in value;
}

async function parseAiResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isAiFailure(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("AI request failed.");
  }

  return payload;
}

export async function refineScenePrompt(input: {
  customPrompt: string;
  contentType?: string;
}): Promise<RefineSceneSuccess> {
  const response = await fetch("/api/ai/refine-scene", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const payload = await parseAiResponse(response);

  if (!isRefineSceneSuccess(payload)) {
    throw new Error("AI response was invalid.");
  }

  return payload;
}

export async function analyzeSceneReference(assetId: string): Promise<AnalyzeSceneReferenceSuccess> {
  const response = await fetch("/api/ai/analyze-scene-reference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId })
  });
  const payload = await parseAiResponse(response);

  if (!isAnalyzeSceneReferenceSuccess(payload)) {
    throw new Error("AI response was invalid.");
  }

  return payload;
}

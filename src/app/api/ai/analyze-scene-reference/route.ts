import { NextResponse } from "next/server";
import { aiConfig } from "@/config/ai";
import { aiErrorResponse, AiRouteError } from "@/lib/ai/errors";
import { analyzeSceneReferenceImage } from "@/lib/ai/prompt-intelligence";
import { getSafeAiMetadata } from "@/lib/openai/client";
import { getCurrentProjectAsset } from "@/lib/projects/project-repository";
import { AssetStorageError, readStoredAsset } from "@/lib/storage/asset-storage";

export const runtime = "nodejs";

interface AnalyzeSceneReferenceRequest {
  assetId?: unknown;
}

function isSupportedReferenceMimeType(mimeType: string) {
  return aiConfig.supportedReferenceMimeTypes.some((supported) => supported === mimeType);
}

export async function POST(request: Request) {
  let body: AnalyzeSceneReferenceRequest;

  try {
    body = (await request.json()) as AnalyzeSceneReferenceRequest;
  } catch {
    return await aiErrorResponse(new AiRouteError("ASSET_NOT_FOUND", "Scene reference asset was not found.", 404));
  }

  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";

  if (!assetId) {
    return await aiErrorResponse(new AiRouteError("ASSET_NOT_FOUND", "Scene reference asset was not found.", 404));
  }

  try {
    const asset = await getCurrentProjectAsset(assetId);

    if (!asset) {
      return await aiErrorResponse(new AiRouteError("ASSET_NOT_FOUND", "Scene reference asset was not found.", 404));
    }

    if (asset.type !== "scene_reference") {
      return await aiErrorResponse(new AiRouteError("INVALID_SCENE_REFERENCE", "Asset is not a scene reference.", 400));
    }

    if (!isSupportedReferenceMimeType(asset.mimeType)) {
      return await aiErrorResponse(new AiRouteError("UNSUPPORTED_REFERENCE_IMAGE", "Use JPEG, PNG, or WebP scene references.", 415));
    }

    const storedAsset = await readStoredAsset(asset.fileName);

    if (!isSupportedReferenceMimeType(storedAsset.contentType)) {
      return await aiErrorResponse(new AiRouteError("UNSUPPORTED_REFERENCE_IMAGE", "Use JPEG, PNG, or WebP scene references.", 415));
    }

    const imageDataUrl = `data:${storedAsset.contentType};base64,${storedAsset.bytes.toString("base64")}`;
    const result = await analyzeSceneReferenceImage({
      imageDataUrl,
      mimeType: storedAsset.contentType
    });

    return NextResponse.json({
      result,
      ai: await getSafeAiMetadata()
    });
  } catch (error) {
    if (error instanceof AiRouteError) {
      return await aiErrorResponse(error);
    }

    if (error instanceof AssetStorageError) {
      return await aiErrorResponse(new AiRouteError("ASSET_NOT_FOUND", "Scene reference asset was not found.", 404));
    }

    return await aiErrorResponse(new AiRouteError("AI_REQUEST_FAILED", "AI assistance request failed.", 502));
  }
}

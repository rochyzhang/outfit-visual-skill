"use client";

import type { Asset, AssetType } from "@/types/domain";

interface UploadAssetSuccess {
  asset: Asset;
}

interface UploadAssetFailure {
  error: {
    code: string;
    message: string;
  };
}

function isUploadAssetFailure(value: unknown): value is UploadAssetFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function isUploadAssetSuccess(value: unknown): value is UploadAssetSuccess {
  return typeof value === "object" && value !== null && "asset" in value;
}

export async function uploadAsset(file: File, assetType: AssetType): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);

  const response = await fetch("/api/assets/upload", {
    method: "POST",
    body: formData
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isUploadAssetFailure(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("Upload failed.");
  }

  if (!isUploadAssetSuccess(payload)) {
    throw new Error("Upload response was invalid.");
  }

  return payload.asset;
}

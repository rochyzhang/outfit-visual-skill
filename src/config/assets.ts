import type { AssetType } from "@/types/domain";

export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type AcceptedImageMimeType = (typeof acceptedImageMimeTypes)[number];

export const maxImageSizeBytes = 10 * 1024 * 1024;

export const allowedAssetTypes = ["product", "scene_reference"] as const satisfies readonly AssetType[];

export function isAcceptedImageMimeType(mimeType: string): mimeType is AcceptedImageMimeType {
  return acceptedImageMimeTypes.includes(mimeType as AcceptedImageMimeType);
}

export function isAllowedAssetType(assetType: string): assetType is AssetType {
  return allowedAssetTypes.includes(assetType as AssetType);
}

export function imageExtensionForMimeType(mimeType: AcceptedImageMimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }

  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}

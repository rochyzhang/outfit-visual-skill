import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageSize } from "image-size";
import { imageExtensionForMimeType, isAcceptedImageMimeType } from "@/config/assets";
import type { AcceptedImageMimeType } from "@/config/assets";
import type { Asset, AssetType } from "@/types/domain";

const assetsDirectory = path.join(process.cwd(), "storage", "assets");
const assetFileNamePattern = /^[a-z_]+-[0-9a-f-]{36}\.(jpg|png|webp)$/;

export class AssetStorageError extends Error {
  constructor(
    public readonly code: "INVALID_IMAGE" | "STORAGE_WRITE_FAILED" | "ASSET_NOT_FOUND" | "INVALID_ASSET_PATH",
    message: string
  ) {
    super(message);
  }
}

function ensureInsideAssetsDirectory(filePath: string) {
  const resolvedRoot = path.resolve(assetsDirectory);
  const resolvedFilePath = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolvedFilePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AssetStorageError("INVALID_ASSET_PATH", "Invalid asset path.");
  }

  return resolvedFilePath;
}

export function resolveStoredAssetPath(fileName: string) {
  if (!assetFileNamePattern.test(fileName)) {
    throw new AssetStorageError("INVALID_ASSET_PATH", "Invalid asset path.");
  }

  return ensureInsideAssetsDirectory(path.join(assetsDirectory, fileName));
}

export function getContentTypeForStoredAsset(fileName: string) {
  if (fileName.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }

  throw new AssetStorageError("INVALID_ASSET_PATH", "Unsupported stored asset type.");
}

export async function readStoredAsset(fileName: string) {
  const filePath = resolveStoredAssetPath(fileName);

  try {
    const [bytes, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);
    return {
      bytes,
      contentType: getContentTypeForStoredAsset(fileName),
      sizeBytes: fileStats.size
    };
  } catch {
    throw new AssetStorageError("ASSET_NOT_FOUND", "Asset not found.");
  }
}

export async function writeAssetFile(input: {
  assetType: AssetType;
  originalFileName: string;
  mimeType: AcceptedImageMimeType;
  buffer: Buffer;
}): Promise<Asset> {
  const id = crypto.randomUUID();
  const fileName = `${input.assetType}-${id}.${imageExtensionForMimeType(input.mimeType)}`;
  const filePath = resolveStoredAssetPath(fileName);

  let dimensions: ReturnType<typeof imageSize>;

  try {
    dimensions = imageSize(input.buffer);
  } catch {
    throw new AssetStorageError("INVALID_IMAGE", "The uploaded file is not a valid image.");
  }

  if (!dimensions.width || !dimensions.height || !isAcceptedImageMimeType(input.mimeType)) {
    throw new AssetStorageError("INVALID_IMAGE", "The uploaded file is not a valid supported image.");
  }

  try {
    await mkdir(assetsDirectory, { recursive: true });
    await writeFile(filePath, input.buffer, { flag: "wx" });
  } catch {
    throw new AssetStorageError("STORAGE_WRITE_FAILED", "Could not save uploaded image.");
  }

  return {
    id,
    type: input.assetType,
    fileName,
    originalFileName: input.originalFileName,
    relativePath: `assets/${fileName}`,
    publicUrl: `/api/assets/${fileName}`,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: new Date().toISOString()
  };
}

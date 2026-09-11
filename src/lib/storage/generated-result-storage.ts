import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageSize } from "image-size";
import { imageExtensionForMimeType, isAcceptedImageMimeType, maxImageSizeBytes } from "@/config/assets";
import type { AcceptedImageMimeType } from "@/config/assets";

const generatedDirectory = path.join(process.cwd(), "storage", "generated");
const generatedFileNamePattern = /^(manual-result|generated-result)-[0-9a-f-]{36}\.(jpg|png|webp)$/;
type GeneratedFileNamePrefix = "manual-result" | "generated-result";

export interface ImportedGeneratedResult {
  id: string;
  fileName: string;
  originalFileName: string;
  publicUrl: string;
  mimeType: AcceptedImageMimeType;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export class GeneratedResultStorageError extends Error {
  constructor(
    public readonly code: "INVALID_IMAGE" | "STORAGE_WRITE_FAILED" | "RESULT_NOT_FOUND" | "INVALID_RESULT_PATH",
    message: string
  ) {
    super(message);
  }
}

function ensureInsideGeneratedDirectory(filePath: string) {
  const resolvedRoot = path.resolve(generatedDirectory);
  const resolvedFilePath = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolvedFilePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new GeneratedResultStorageError("INVALID_RESULT_PATH", "Invalid result path.");
  }

  return resolvedFilePath;
}

export function resolveGeneratedResultPath(fileName: string) {
  if (!generatedFileNamePattern.test(fileName)) {
    throw new GeneratedResultStorageError("INVALID_RESULT_PATH", "Invalid result path.");
  }

  return ensureInsideGeneratedDirectory(path.join(generatedDirectory, fileName));
}

export function getContentTypeForGeneratedResult(fileName: string) {
  if (fileName.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }

  throw new GeneratedResultStorageError("INVALID_RESULT_PATH", "Unsupported generated result type.");
}

export async function readGeneratedResult(fileName: string) {
  const filePath = resolveGeneratedResultPath(fileName);

  try {
    const [bytes, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);
    return {
      bytes,
      contentType: getContentTypeForGeneratedResult(fileName),
      sizeBytes: fileStats.size
    };
  } catch {
    throw new GeneratedResultStorageError("RESULT_NOT_FOUND", "Generated result not found.");
  }
}

export async function writeGeneratedResultFile(input: {
  originalFileName: string;
  mimeType: AcceptedImageMimeType;
  buffer: Buffer;
  fileNamePrefix?: GeneratedFileNamePrefix;
}): Promise<ImportedGeneratedResult> {
  const id = crypto.randomUUID();
  const fileName = `${input.fileNamePrefix ?? "manual-result"}-${id}.${imageExtensionForMimeType(input.mimeType)}`;
  const filePath = resolveGeneratedResultPath(fileName);

  let dimensions: ReturnType<typeof imageSize>;

  if (input.buffer.byteLength > maxImageSizeBytes) {
    throw new GeneratedResultStorageError("INVALID_IMAGE", "The imported result is too large.");
  }

  try {
    dimensions = imageSize(input.buffer);
  } catch {
    throw new GeneratedResultStorageError("INVALID_IMAGE", "The imported result is not a valid image.");
  }

  if (!dimensions.width || !dimensions.height || !isAcceptedImageMimeType(input.mimeType)) {
    throw new GeneratedResultStorageError("INVALID_IMAGE", "The imported result is not a valid supported image.");
  }

  try {
    await mkdir(generatedDirectory, { recursive: true });
    await writeFile(filePath, input.buffer, { flag: "wx" });
  } catch {
    throw new GeneratedResultStorageError("STORAGE_WRITE_FAILED", "Could not save imported result.");
  }

  return {
    id,
    fileName,
    originalFileName: input.originalFileName,
    publicUrl: `/api/results/${fileName}`,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: new Date().toISOString()
  };
}
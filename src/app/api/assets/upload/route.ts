import { NextResponse } from "next/server";
import { isAcceptedImageMimeType, isAllowedAssetType, maxImageSizeBytes } from "@/config/assets";
import { AssetStorageError, writeAssetFile } from "@/lib/storage/asset-storage";
import { persistAssetForCurrentProject, ProjectRepositoryError } from "@/lib/projects/project-repository";

export const runtime = "nodejs";

type UploadErrorCode =
  | "NO_FILE"
  | "INVALID_ASSET_TYPE"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_IMAGE"
  | "STORAGE_WRITE_FAILED"
  | "ASSET_RECORD_FAILED";

function errorResponse(code: UploadErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("NO_FILE", "Upload must use multipart form data.", 400);
  }

  const file = formData.get("file");
  const assetTypeValue = formData.get("assetType");

  if (!(file instanceof File)) {
    return errorResponse("NO_FILE", "Choose an image file to upload.", 400);
  }

  if (typeof assetTypeValue !== "string" || !isAllowedAssetType(assetTypeValue)) {
    return errorResponse("INVALID_ASSET_TYPE", "Asset type must be product or scene_reference.", 400);
  }

  if (!isAcceptedImageMimeType(file.type)) {
    return errorResponse("UNSUPPORTED_IMAGE_TYPE", "Use JPEG, PNG, or WebP images.", 415);
  }

  if (file.size > maxImageSizeBytes) {
    return errorResponse("IMAGE_TOO_LARGE", "Image must be 10 MB or smaller.", 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const asset = await writeAssetFile({
      assetType: assetTypeValue,
      originalFileName: file.name,
      mimeType: file.type,
      buffer
    });
    const persistedAsset = await persistAssetForCurrentProject(asset);

    return NextResponse.json({ asset: persistedAsset });
  } catch (error) {
    if (error instanceof AssetStorageError && error.code === "INVALID_IMAGE") {
      return errorResponse("INVALID_IMAGE", error.message, 422);
    }

    if (error instanceof ProjectRepositoryError && error.code === "ASSET_RECORD_FAILED") {
      return errorResponse(
        "ASSET_RECORD_FAILED",
        "Image file was stored, but its asset record could not be saved.",
        500
      );
    }

    return errorResponse("STORAGE_WRITE_FAILED", "Could not save uploaded image.", 500);
  }
}

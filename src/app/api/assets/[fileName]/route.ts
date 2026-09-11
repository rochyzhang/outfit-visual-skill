import { AssetStorageError, readStoredAsset } from "@/lib/storage/asset-storage";

export const runtime = "nodejs";

interface AssetRouteContext {
  params: Promise<{
    fileName: string;
  }>;
}

export async function GET(_request: Request, context: AssetRouteContext) {
  const { fileName } = await context.params;

  try {
    const asset = await readStoredAsset(fileName);

    return new Response(asset.bytes, {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.sizeBytes),
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    if (error instanceof AssetStorageError) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 404 });
  }
}

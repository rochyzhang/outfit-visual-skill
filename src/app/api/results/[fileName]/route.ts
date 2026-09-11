import { GeneratedResultStorageError, readGeneratedResult } from "@/lib/storage/generated-result-storage";

export const runtime = "nodejs";

interface ResultRouteContext {
  params: Promise<{
    fileName: string;
  }>;
}

export async function GET(_request: Request, context: ResultRouteContext) {
  const { fileName } = await context.params;

  try {
    const result = await readGeneratedResult(fileName);

    return new Response(result.bytes, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.sizeBytes),
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    if (error instanceof GeneratedResultStorageError) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 404 });
  }
}

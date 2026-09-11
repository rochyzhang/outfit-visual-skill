import { NextResponse } from "next/server";
import { testGeminiConnection } from "@/lib/providers/adapters/gemini-provider-adapter";
import { testOpenAIConnection } from "@/lib/providers/adapters/openai-provider-adapter";
import { assertProviderId } from "@/lib/providers/provider-resolver";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

export const runtime = "nodejs";

interface ProviderTestRouteContext {
  params: Promise<{
    providerId: string;
  }>;
}

function errorResponse(error: ProviderSettingsError) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message
      }
    },
    { status: error.status }
  );
}

export async function POST(_request: Request, context: ProviderTestRouteContext) {
  try {
    const providerId = assertProviderId((await context.params).providerId);

    if (providerId === "openai") {
      return NextResponse.json(await testOpenAIConnection());
    }

    if (providerId === "gemini") {
      return NextResponse.json(await testGeminiConnection());
    }

    if (providerId === "chatgpt_manual") {
      return NextResponse.json({
        ok: true,
        message: "Manual provider is ready. No API connection is required."
      });
    }

    throw new ProviderSettingsError("PROVIDER_NOT_IMPLEMENTED", "Provider connection test is coming later.", 400);
  } catch (error) {
    if (error instanceof ProviderSettingsError) {
      return errorResponse(error);
    }

    return errorResponse(new ProviderSettingsError("OPENAI_CONNECTION_FAILED", "Provider connection failed.", 502));
  }
}

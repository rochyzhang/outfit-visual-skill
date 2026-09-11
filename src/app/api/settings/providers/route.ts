import { NextResponse } from "next/server";
import { listProviderStatuses } from "@/lib/providers/provider-resolver";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

export const runtime = "nodejs";

function providerErrorResponse(error: ProviderSettingsError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message
      }
    },
    { status: error.status }
  );
}

export async function GET() {
  try {
    return NextResponse.json({
      providers: await listProviderStatuses()
    });
  } catch (error) {
    if (error instanceof ProviderSettingsError) {
      return providerErrorResponse(error);
    }

    return providerErrorResponse(
      new ProviderSettingsError("PROVIDER_SECRET_READ_FAILED", "Could not read local provider settings.", 500)
    );
  }
}

import { NextResponse } from "next/server";
import {
  assertProviderId,
  getProviderStatus,
  removeProviderCredential,
  saveProviderCredential
} from "@/lib/providers/provider-resolver";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

export const runtime = "nodejs";

interface ProviderRouteContext {
  params: Promise<{
    providerId: string;
  }>;
}

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

export async function GET(_request: Request, context: ProviderRouteContext) {
  try {
    const providerId = assertProviderId((await context.params).providerId);
    return NextResponse.json(await getProviderStatus(providerId));
  } catch (error) {
    if (error instanceof ProviderSettingsError) {
      return providerErrorResponse(error);
    }

    return providerErrorResponse(
      new ProviderSettingsError("PROVIDER_SECRET_READ_FAILED", "Could not read local provider settings.", 500)
    );
  }
}

export async function PUT(request: Request, context: ProviderRouteContext) {
  let body: { credential?: unknown };

  try {
    body = (await request.json()) as { credential?: unknown };
  } catch {
    return providerErrorResponse(new ProviderSettingsError("INVALID_API_KEY_INPUT", "Enter an API key.", 400));
  }

  try {
    const providerId = assertProviderId((await context.params).providerId);
    return NextResponse.json(await saveProviderCredential(providerId, typeof body.credential === "string" ? body.credential : ""));
  } catch (error) {
    if (error instanceof ProviderSettingsError) {
      return providerErrorResponse(error);
    }

    return providerErrorResponse(
      new ProviderSettingsError("PROVIDER_SECRET_WRITE_FAILED", "Could not save local provider settings.", 500)
    );
  }
}

export async function DELETE(_request: Request, context: ProviderRouteContext) {
  try {
    const providerId = assertProviderId((await context.params).providerId);
    return NextResponse.json(await removeProviderCredential(providerId));
  } catch (error) {
    if (error instanceof ProviderSettingsError) {
      return providerErrorResponse(error);
    }

    return providerErrorResponse(
      new ProviderSettingsError("PROVIDER_SECRET_REMOVE_FAILED", "Could not remove local provider settings.", 500)
    );
  }
}

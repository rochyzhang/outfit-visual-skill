import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError
} from "openai";
import type { ClientOptions } from "openai";
import { FormData as UndiciFormData, ProxyAgent, fetch as undiciFetch } from "undici";
import { aiConfig } from "@/config/ai";
import { openAIImageGenerationConfig } from "@/config/openai-image-generation";
import { resolveProviderCredential } from "@/lib/providers/provider-resolver";
import type { ProviderId } from "@/lib/providers/provider-types";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

export const openAIProviderId: ProviderId = "openai";

function openAIProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    null
  );
}

function isGlobalFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function toUndiciFormData(body: FormData) {
  const form = new UndiciFormData();

  for (const [key, value] of body.entries()) {
    if (typeof value === "string") {
      form.append(key, value);
      continue;
    }

    form.append(key, value as unknown as Blob, value.name || "upload");
  }

  return form;
}

export function createOpenAIProxyFetch(): ClientOptions["fetch"] {
  const fetchWithCompatibleFormData = async (input: RequestInfo | URL, init?: RequestInit) => {
    const compatibleInit = init
      ? {
          ...init,
          body: isGlobalFormData(init.body) ? toUndiciFormData(init.body) : init.body
        }
      : init;
    const response = await undiciFetch(input as Parameters<typeof undiciFetch>[0], compatibleInit as Parameters<typeof undiciFetch>[1]);

    return response as unknown as Response;
  };

  return Object.assign(fetchWithCompatibleFormData, { Response }) as unknown as ClientOptions["fetch"];
}

export function openAIClientOptions(apiKey: string): ClientOptions {
  const proxyUrl = openAIProxyUrl();
  const baseOptions: ClientOptions = {
    apiKey,
    timeout: aiConfig.openAIConnectionTestTimeoutMs
  };

  if (!proxyUrl) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    fetch: createOpenAIProxyFetch(),
    fetchOptions: {
      dispatcher: new ProxyAgent(proxyUrl)
    } as ClientOptions["fetchOptions"]
  };
}

export async function createOpenAIClient() {
  const resolved = await resolveProviderCredential(openAIProviderId);
  return new OpenAI(openAIClientOptions(resolved.credential));
}

interface OpenAIConnectionClientLike {
  models: {
    list: (options?: { timeout?: number }) => Promise<unknown>;
    retrieve: (model: string, options?: { timeout?: number }) => Promise<{ id: string }>;
  };
}

interface OpenAIConnectionTestDependencies {
  createClient: () => Promise<OpenAIConnectionClientLike>;
}

function safeDiagnostics(input: {
  code: ProviderSettingsError["code"];
  endpointFamily: string;
  method: string;
  model?: string;
  status?: number;
  requestId?: string | null;
  providerCode?: string | null;
  providerType?: string;
}) {
  return input;
}

function logOpenAIConnectionDiagnostic(diagnostic: ReturnType<typeof safeDiagnostics>) {
  console.warn("OpenAI provider connection diagnostic", diagnostic);
}

function classifyOpenAIConnectionError(error: unknown, method: string, model?: string) {
  if (error instanceof ProviderSettingsError) {
    return error;
  }

  if (error instanceof AuthenticationError) {
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code: "OPENAI_AUTH_FAILED",
        endpointFamily: "models",
        method,
        model,
        status: error.status,
        requestId: error.requestID,
        providerCode: error.code,
        providerType: error.type
      })
    );
    return new ProviderSettingsError("OPENAI_AUTH_FAILED", "OpenAI credential was rejected.", 401);
  }

  if (error instanceof PermissionDeniedError) {
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code: "OPENAI_PERMISSION_DENIED",
        endpointFamily: "models",
        method,
        model,
        status: error.status,
        requestId: error.requestID,
        providerCode: error.code,
        providerType: error.type
      })
    );
    return new ProviderSettingsError("OPENAI_PERMISSION_DENIED", "OpenAI project or account does not have permission for this API.", 403);
  }

  if (error instanceof RateLimitError) {
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code: "OPENAI_RATE_LIMITED",
        endpointFamily: "models",
        method,
        model,
        status: error.status,
        requestId: error.requestID,
        providerCode: error.code,
        providerType: error.type
      })
    );
    return new ProviderSettingsError("OPENAI_RATE_LIMITED", "OpenAI API quota or billing is unavailable.", 429);
  }

  if (error instanceof BadRequestError || error instanceof NotFoundError) {
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code: "OPENAI_MODEL_UNAVAILABLE",
        endpointFamily: "models",
        method,
        model,
        status: error.status,
        requestId: error.requestID,
        providerCode: error.code,
        providerType: error.type
      })
    );
    return new ProviderSettingsError("OPENAI_MODEL_UNAVAILABLE", "The configured OpenAI test model is not available.", error.status);
  }

  if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code: "OPENAI_NETWORK_ERROR",
        endpointFamily: "models",
        method,
        model
      })
    );
    return new ProviderSettingsError("OPENAI_NETWORK_ERROR", "The app could not reach the OpenAI API.", 502);
  }

  if (error instanceof APIError) {
    const code = error.status && error.status >= 500 ? "OPENAI_UPSTREAM_ERROR" : "OPENAI_CONNECTION_FAILED";
    logOpenAIConnectionDiagnostic(
      safeDiagnostics({
        code,
        endpointFamily: "models",
        method,
        model,
        status: error.status,
        requestId: error.requestID,
        providerCode: error.code,
        providerType: error.type
      })
    );

    if (code === "OPENAI_UPSTREAM_ERROR") {
      return new ProviderSettingsError("OPENAI_UPSTREAM_ERROR", "OpenAI API returned a temporary server error.", 502);
    }
  }

  logOpenAIConnectionDiagnostic(
    safeDiagnostics({
      code: "OPENAI_CONNECTION_FAILED",
      endpointFamily: "models",
      method,
      model
    })
  );
  return new ProviderSettingsError("OPENAI_CONNECTION_FAILED", "OpenAI connection failed.", 502);
}

async function checkOpenAIImageModelAccess(client: OpenAIConnectionClientLike) {
  try {
    const model = await client.models.retrieve(openAIImageGenerationConfig.model, {
      timeout: aiConfig.openAIConnectionTestTimeoutMs
    });

    return {
      status: "available" as const,
      model: model.id
    };
  } catch (error) {
    const classified = classifyOpenAIConnectionError(error, "models.retrieve", openAIImageGenerationConfig.model);

    return {
      status: "unavailable" as const,
      model: openAIImageGenerationConfig.model,
      code: classified.code,
      message: classified.message
    };
  }
}

export async function testOpenAIConnection(
  dependencies: OpenAIConnectionTestDependencies = {
    createClient: async () => (await createOpenAIClient()) as unknown as OpenAIConnectionClientLike
  }
) {
  try {
    const client = await dependencies.createClient();
    await client.models.list({
      timeout: aiConfig.openAIConnectionTestTimeoutMs
    });
    const imageModel = await checkOpenAIImageModelAccess(client);

    return {
      ok: true,
      message: "Connection successful",
      diagnostics: {
        endpointFamily: "models",
        method: "models.list",
        timeoutMs: aiConfig.openAIConnectionTestTimeoutMs,
        imageModel
      }
    };
  } catch (error) {
    throw classifyOpenAIConnectionError(error, "models.list");
  }
}

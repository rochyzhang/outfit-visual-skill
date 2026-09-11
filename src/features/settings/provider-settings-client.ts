"use client";

export type ProviderId = "openai" | "chatgpt_manual" | "gemini" | "stability" | "replicate";
export type ProviderCredentialSource = "environment" | "local_secret_store" | "none";
export type ProviderMode = "manual" | "api";

export interface ProviderCapabilities {
  promptIntelligence: boolean;
  imageGeneration: boolean;
  manualGeneration: boolean;
  imageEditing: boolean;
  multiImageReference: boolean;
}

export interface ProviderStatus {
  providerId: ProviderId;
  name: string;
  displayName: string;
  mode: ProviderMode;
  description: string;
  comingLater: boolean;
  implemented: boolean;
  supportsCredential: boolean;
  configured: boolean;
  available: boolean;
  source: ProviderCredentialSource;
  maskedCredential?: string;
  model?: string;
  message?: string;
  capabilities: ProviderCapabilities;
}

interface ProviderListSuccess {
  providers: ProviderStatus[];
}

interface ProviderFailure {
  error: {
    code: string;
    message: string;
  };
}

interface ProviderTestSuccess {
  ok: true;
  message: string;
}

interface ProviderTestFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

function isProviderFailure(value: unknown): value is ProviderFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function isProviderStatus(value: unknown): value is ProviderStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { providerId?: unknown }).providerId === "string" &&
    typeof (value as { configured?: unknown }).configured === "boolean" &&
    typeof (value as { available?: unknown }).available === "boolean" &&
    typeof (value as { source?: unknown }).source === "string"
  );
}

function isProviderList(value: unknown): value is ProviderListSuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { providers?: unknown }).providers) &&
    (value as { providers: unknown[] }).providers.every(isProviderStatus)
  );
}

async function parseProviderResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isProviderFailure(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("Provider settings request failed.");
  }

  return payload;
}

export async function fetchProviderStatuses() {
  const payload = await parseProviderResponse(await fetch("/api/settings/providers"));

  if (!isProviderList(payload)) {
    throw new Error("Provider status response was invalid.");
  }

  return payload.providers;
}

export async function saveProviderCredential(providerId: ProviderId, credential: string) {
  const payload = await parseProviderResponse(
    await fetch(`/api/settings/providers/${providerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential })
    })
  );

  if (!isProviderStatus(payload)) {
    throw new Error("Provider status response was invalid.");
  }

  return payload;
}

export async function removeProviderCredential(providerId: ProviderId) {
  const payload = await parseProviderResponse(
    await fetch(`/api/settings/providers/${providerId}`, {
      method: "DELETE"
    })
  );

  if (!isProviderStatus(payload)) {
    throw new Error("Provider status response was invalid.");
  }

  return payload;
}

export async function testProviderConnection(providerId: ProviderId) {
  const payload: unknown = await (await fetch(`/api/settings/providers/${providerId}/test`, { method: "POST" })).json().catch(() => null);

  if (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    (payload as ProviderTestSuccess | ProviderTestFailure).ok === true
  ) {
    return payload as ProviderTestSuccess;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload &&
    (payload as ProviderTestSuccess | ProviderTestFailure).ok === false
  ) {
    throw new Error((payload as ProviderTestFailure).error.message);
  }

  throw new Error("Provider connection test failed.");
}

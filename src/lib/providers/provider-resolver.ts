import { getProviderDefinition, providerDefinitions, providerModelLabel } from "@/lib/providers/provider-registry";
import { readProviderSecret, removeProviderSecret, writeProviderSecret } from "@/lib/providers/provider-secret-store";
import type { ProviderId, ProviderStatus, ResolvedProviderCredential } from "@/lib/providers/provider-types";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

function maskCredential(credential: string) {
  return `************${credential.slice(-4)}`;
}

function environmentCredential(environmentKeyName?: string) {
  if (!environmentKeyName) {
    return null;
  }

  return process.env[environmentKeyName]?.trim() || null;
}

function validateOpenAICredential(credential: string) {
  const trimmed = credential.trim();

  if (!trimmed) {
    throw new ProviderSettingsError("INVALID_API_KEY_INPUT", "Enter an API key.", 400);
  }

  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(trimmed)) {
    throw new ProviderSettingsError("INVALID_API_KEY_INPUT", "API key format is invalid.", 400);
  }

  return trimmed;
}

function validateGeminiCredential(credential: string) {
  const trimmed = credential.trim();

  if (!trimmed) {
    throw new ProviderSettingsError("INVALID_API_KEY_INPUT", "Enter an API key.", 400);
  }

  if (/\s/.test(trimmed) || trimmed.length < 20) {
    throw new ProviderSettingsError("INVALID_API_KEY_INPUT", "Gemini API key format is invalid.", 400);
  }

  return trimmed;
}

export function assertProviderId(providerId: string): ProviderId {
  const definition = getProviderDefinition(providerId);

  if (!definition) {
    throw new ProviderSettingsError("INVALID_PROVIDER", "Provider is not supported.", 404);
  }

  return definition.id;
}

function assertImplementedProvider(providerId: ProviderId) {
  const definition = getProviderDefinition(providerId);

  if (!definition || !definition.implemented) {
    throw new ProviderSettingsError("PROVIDER_NOT_IMPLEMENTED", "Provider settings are coming later.", 400);
  }

  return definition;
}

export async function getProviderStatus(providerId: ProviderId): Promise<ProviderStatus> {
  const definition = getProviderDefinition(providerId);

  if (!definition) {
    throw new ProviderSettingsError("INVALID_PROVIDER", "Provider is not supported.", 404);
  }

  if (!definition.implemented) {
    return {
      providerId,
      name: definition.displayName,
      displayName: definition.displayName,
      mode: definition.mode,
      description: definition.description,
      comingLater: true,
      implemented: false,
      supportsCredential: definition.supportsCredential,
      configured: false,
      available: false,
      source: "none",
      model: providerModelLabel(providerId),
      capabilities: definition.capabilities,
      message: "Coming later"
    };
  }

  if (!definition.supportsCredential) {
    return {
      providerId,
      name: definition.displayName,
      displayName: definition.displayName,
      mode: definition.mode,
      description: definition.description,
      comingLater: false,
      implemented: true,
      supportsCredential: false,
      configured: true,
      available: true,
      source: "none",
      model: providerModelLabel(providerId),
      capabilities: definition.capabilities,
      message: "Ready"
    };
  }

  const envCredential = environmentCredential(definition.environmentKeyName);

  if (envCredential) {
    return {
      providerId,
      name: definition.displayName,
      displayName: definition.displayName,
      mode: definition.mode,
      description: definition.description,
      comingLater: false,
      implemented: true,
      supportsCredential: true,
      configured: true,
      available: true,
      source: "environment",
      model: providerModelLabel(providerId),
      capabilities: definition.capabilities,
      message: "Configured via environment variable."
    };
  }

  const localCredential = await readProviderSecret(providerId);

  if (localCredential) {
    return {
      providerId,
      name: definition.displayName,
      displayName: definition.displayName,
      mode: definition.mode,
      description: definition.description,
      comingLater: false,
      implemented: true,
      supportsCredential: true,
      configured: true,
      available: true,
      source: "local_secret_store",
      maskedCredential: maskCredential(localCredential),
      model: providerModelLabel(providerId),
      capabilities: definition.capabilities
    };
  }

  return {
    providerId,
    name: definition.displayName,
    displayName: definition.displayName,
    mode: definition.mode,
    description: definition.description,
    comingLater: false,
    implemented: true,
    supportsCredential: true,
    configured: false,
    available: false,
    source: "none",
    model: providerModelLabel(providerId),
    capabilities: definition.capabilities
  };
}

export async function listProviderStatuses() {
  return Promise.all(providerDefinitions.map((provider) => getProviderStatus(provider.id)));
}

export async function resolveProviderCredential(providerId: ProviderId): Promise<ResolvedProviderCredential> {
  const definition = assertImplementedProvider(providerId);

  if (!definition.supportsCredential) {
    throw new ProviderSettingsError("PROVIDER_CREDENTIAL_NOT_SUPPORTED", "This provider does not use an API credential.", 400);
  }

  const envCredential = environmentCredential(definition.environmentKeyName);

  if (envCredential) {
    return {
      providerId,
      credential: envCredential,
      source: "environment"
    };
  }

  const localCredential = await readProviderSecret(providerId);

  if (localCredential) {
    return {
      providerId,
      credential: localCredential,
      source: "local_secret_store"
    };
  }

  if (providerId === "gemini") {
    throw new ProviderSettingsError("GEMINI_API_KEY_MISSING", "Configure Gemini in Settings before testing the provider.", 503);
  }

  throw new ProviderSettingsError("OPENAI_API_KEY_MISSING", "Configure OpenAI in Settings before using AI assistance.", 503);
}

export async function saveProviderCredential(providerId: ProviderId, credential: string) {
  const definition = assertImplementedProvider(providerId);

  if (!definition.supportsCredential) {
    throw new ProviderSettingsError("PROVIDER_CREDENTIAL_NOT_SUPPORTED", "This provider does not use an API credential.", 400);
  }

  const validatedCredential =
    providerId === "openai"
      ? validateOpenAICredential(credential)
      : providerId === "gemini"
        ? validateGeminiCredential(credential)
        : credential.trim();

  await writeProviderSecret(providerId, validatedCredential);
  return getProviderStatus(providerId);
}

export async function removeProviderCredential(providerId: ProviderId) {
  const definition = assertImplementedProvider(providerId);

  if (!definition.supportsCredential) {
    throw new ProviderSettingsError("PROVIDER_CREDENTIAL_NOT_SUPPORTED", "This provider does not use an API credential.", 400);
  }

  if (environmentCredential(definition.environmentKeyName)) {
    return {
      ...(await getProviderStatus(providerId)),
      message: "Environment configuration remains active and cannot be removed from the UI."
    };
  }

  await removeProviderSecret(providerId);
  return getProviderStatus(providerId);
}

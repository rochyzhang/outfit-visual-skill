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

export interface ProviderDefinition {
  id: ProviderId;
  displayName: string;
  mode: ProviderMode;
  description: string;
  capabilities: ProviderCapabilities;
  supportsCredential: boolean;
  implemented: boolean;
  environmentKeyName?: string;
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

export interface ResolvedProviderCredential {
  providerId: ProviderId;
  credential: string;
  source: Exclude<ProviderCredentialSource, "none">;
}

export class ProviderSettingsError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PROVIDER"
      | "PROVIDER_NOT_IMPLEMENTED"
      | "PROVIDER_CREDENTIAL_NOT_SUPPORTED"
      | "INVALID_API_KEY_INPUT"
      | "PROVIDER_SECRET_WRITE_FAILED"
      | "PROVIDER_SECRET_READ_FAILED"
      | "PROVIDER_SECRET_REMOVE_FAILED"
      | "OPENAI_CONNECTION_FAILED"
      | "OPENAI_AUTH_FAILED"
      | "OPENAI_PERMISSION_DENIED"
      | "OPENAI_RATE_LIMITED"
      | "OPENAI_MODEL_UNAVAILABLE"
      | "OPENAI_NETWORK_ERROR"
      | "OPENAI_UPSTREAM_ERROR"
      | "OPENAI_API_KEY_MISSING"
      | "GEMINI_CONNECTION_FAILED"
      | "GEMINI_API_KEY_MISSING",
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

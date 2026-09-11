import { aiConfig } from "@/config/ai";
import { createOpenAIClient } from "@/lib/providers/adapters/openai-provider-adapter";
import { getProviderStatus } from "@/lib/providers/provider-resolver";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

export class OpenAIClientError extends Error {
  constructor(
    public readonly code: "OPENAI_API_KEY_MISSING",
    message: string
  ) {
    super(message);
  }
}

export async function getOpenAIClient() {
  try {
    return await createOpenAIClient();
  } catch (error) {
    if (error instanceof ProviderSettingsError && error.code === "OPENAI_API_KEY_MISSING") {
      throw new OpenAIClientError("OPENAI_API_KEY_MISSING", error.message);
    }

    throw error;
  }
}

export async function getSafeAiMetadata() {
  const status = await getProviderStatus("openai");

  return {
    available: status.available,
    model: aiConfig.promptIntelligenceModel,
    source: status.source
  };
}

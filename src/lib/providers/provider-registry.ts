import { aiConfig } from "@/config/ai";
import type { ProviderDefinition, ProviderId } from "@/lib/providers/provider-types";

export const providerDefinitions: ProviderDefinition[] = [
  {
    id: "openai",
    displayName: "OpenAI",
    mode: "api",
    description: "Prompt intelligence and OpenAI automatic image generation.",
    capabilities: {
      promptIntelligence: true,
      imageGeneration: true,
      manualGeneration: false,
      imageEditing: false,
      multiImageReference: true
    },
    supportsCredential: true,
    implemented: true,
    environmentKeyName: "OPENAI_API_KEY"
  },
  {
    id: "chatgpt_manual",
    displayName: "ChatGPT Manual",
    mode: "manual",
    description: "Manual handoff workflow for ChatGPT use. No automatic API call is made.",
    capabilities: {
      promptIntelligence: false,
      imageGeneration: false,
      manualGeneration: true,
      imageEditing: false,
      multiImageReference: true
    },
    supportsCredential: false,
    implemented: true
  },
  {
    id: "gemini",
    displayName: "Gemini",
    mode: "api",
    description: "API provider configuration for future Gemini-powered generation.",
    capabilities: {
      promptIntelligence: false,
      imageGeneration: true,
      manualGeneration: false,
      imageEditing: false,
      multiImageReference: true
    },
    supportsCredential: true,
    implemented: true,
    environmentKeyName: "GEMINI_API_KEY"
  },
  {
    id: "stability",
    displayName: "Stability AI",
    mode: "api",
    description: "Image generation provider option.",
    capabilities: {
      promptIntelligence: false,
      imageGeneration: true,
      manualGeneration: false,
      imageEditing: false,
      multiImageReference: true
    },
    supportsCredential: false,
    implemented: false
  },
  {
    id: "replicate",
    displayName: "Replicate",
    mode: "api",
    description: "Model hosting provider option.",
    capabilities: {
      promptIntelligence: false,
      imageGeneration: true,
      manualGeneration: false,
      imageEditing: false,
      multiImageReference: true
    },
    supportsCredential: false,
    implemented: false
  }
];

export function getProviderDefinition(providerId: string) {
  return providerDefinitions.find((provider) => provider.id === providerId);
}

export function assertProviderDefinition(providerId: string) {
  const definition = getProviderDefinition(providerId);

  if (!definition) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  return definition;
}

export function providerModelLabel(providerId: ProviderId) {
  if (providerId === "openai") {
    return aiConfig.promptIntelligenceModel;
  }

  if (providerId === "gemini") {
    return aiConfig.geminiConnectionTestModel;
  }

  return undefined;
}

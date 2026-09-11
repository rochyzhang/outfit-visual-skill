import type { ProviderId, ProviderMode } from "@/lib/providers/provider-types";
import type { OutputOption } from "@/types/domain";

export type GenerationProviderId = Extract<ProviderId, "openai" | "chatgpt_manual" | "gemini">;

export interface GenerationProviderOption extends OutputOption<GenerationProviderId> {
  mode: ProviderMode;
  description: string;
  generateNote: string;
}

export const defaultGenerationProviderId: GenerationProviderId = "chatgpt_manual";

export const generationProviderOptions: GenerationProviderOption[] = [
  {
    value: "openai",
    label: "OpenAI",
    mode: "api",
    description: "OpenAI automatic image generation through the provider adapter.",
    generateNote: "Generate runs a real OpenAI image request when credentials are connected."
  },
  {
    value: "chatgpt_manual",
    label: "ChatGPT Manual",
    mode: "manual",
    description: "Manual handoff mode. No API call is made automatically.",
    generateNote: "Generate compiles the prompt and QA. Manual handoff package comes in a later task."
  },
  {
    value: "gemini",
    label: "Gemini",
    mode: "api",
    description: "Gemini provider route for future automated generation.",
    generateNote: "Generate still opens the debug panel. Gemini image generation is not implemented yet."
  }
];

const generationProviderIds = new Set<GenerationProviderId>(generationProviderOptions.map((provider) => provider.value));

export function isGenerationProviderId(value: unknown): value is GenerationProviderId {
  return typeof value === "string" && generationProviderIds.has(value as GenerationProviderId);
}

export function getGenerationProviderOption(providerId: GenerationProviderId) {
  return generationProviderOptions.find((provider) => provider.value === providerId) ?? generationProviderOptions[0];
}

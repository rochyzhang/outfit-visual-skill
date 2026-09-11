export const aiConfig = {
  promptIntelligenceModel: process.env.OPENAI_PROMPT_INTELLIGENCE_MODEL?.trim() || "gpt-5",
  openAIConnectionTestTimeoutMs: 30000,
  geminiConnectionTestModel: process.env.GEMINI_CONNECTION_TEST_MODEL?.trim() || "gemini-2.0-flash",
  supportedReferenceMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  maxOutputTokens: 1800
};

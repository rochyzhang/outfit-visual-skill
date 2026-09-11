import { aiConfig } from "@/config/ai";
import { resolveProviderCredential } from "@/lib/providers/provider-resolver";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function hasTextResponse(payload: GeminiGenerateContentResponse) {
  return Boolean(payload.candidates?.some((candidate) => candidate.content?.parts?.some((part) => part.text)));
}

export async function testGeminiConnection() {
  const resolved = await resolveProviderCredential("gemini");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.geminiConnectionTestModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": resolved.credential
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with ok." }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 8,
          temperature: 0
        }
      })
    }
  ).catch(() => {
    throw new ProviderSettingsError("GEMINI_CONNECTION_FAILED", "Gemini connection failed.", 502);
  });

  if (!response.ok) {
    throw new ProviderSettingsError("GEMINI_CONNECTION_FAILED", "Gemini connection failed.", 502);
  }

  const payload = (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;

  if (!payload || !hasTextResponse(payload)) {
    throw new ProviderSettingsError("GEMINI_CONNECTION_FAILED", "Gemini connection response was invalid.", 502);
  }

  return {
    ok: true,
    message: "Connection successful"
  };
}

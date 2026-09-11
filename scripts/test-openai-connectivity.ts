import assert from "node:assert/strict";
import {
  APIConnectionError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError
} from "openai";
import { openAIImageGenerationConfig } from "@/config/openai-image-generation";
import { testOpenAIConnection } from "@/lib/providers/adapters/openai-provider-adapter";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

async function expectProviderError(code: ProviderSettingsError["code"], action: () => Promise<unknown>) {
  await assert.rejects(action, (error: unknown) => error instanceof ProviderSettingsError && error.code === code);
}

async function main() {
  const success = await testOpenAIConnection({
    async createClient() {
      return {
        models: {
          async list() {
            return {};
          },
          async retrieve(model: string) {
            return {
              id: model
            };
          }
        }
      };
    }
  });

  assert.equal(success.ok, true);
  assert.equal(success.diagnostics.method, "models.list");
  assert.equal(success.diagnostics.imageModel.status, "available");
  assert.equal(success.diagnostics.imageModel.model, openAIImageGenerationConfig.model);
  assert.doesNotMatch(JSON.stringify(success), /sk-|Authorization|credential/i);

  const imageModelUnavailable = await testOpenAIConnection({
    async createClient() {
      return {
        models: {
          async list() {
            return {};
          },
          async retrieve() {
            throw new BadRequestError(400, {}, "model unavailable with TEST_SECRET_VALUE", new Headers());
          }
        }
      };
    }
  });
  assert.equal(imageModelUnavailable.ok, true);
  assert.equal(imageModelUnavailable.diagnostics.imageModel.status, "unavailable");
  assert.equal(imageModelUnavailable.diagnostics.imageModel.code, "OPENAI_MODEL_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(imageModelUnavailable), /TEST_SECRET_VALUE|Authorization/);

  await expectProviderError("OPENAI_AUTH_FAILED", async () => {
    await testOpenAIConnection({
      async createClient() {
        return {
          models: {
            async list() {
              throw new AuthenticationError(401, {}, "invalid key with TEST_SECRET_VALUE", new Headers());
            },
            async retrieve(model: string) {
              return { id: model };
            }
          }
        };
      }
    });
  });

  await expectProviderError("OPENAI_PERMISSION_DENIED", async () => {
    await testOpenAIConnection({
      async createClient() {
        return {
          models: {
            async list() {
              throw new PermissionDeniedError(403, {}, "forbidden", new Headers());
            },
            async retrieve(model: string) {
              return { id: model };
            }
          }
        };
      }
    });
  });

  await expectProviderError("OPENAI_RATE_LIMITED", async () => {
    await testOpenAIConnection({
      async createClient() {
        return {
          models: {
            async list() {
              throw new RateLimitError(429, {}, "quota", new Headers());
            },
            async retrieve(model: string) {
              return { id: model };
            }
          }
        };
      }
    });
  });

  await expectProviderError("OPENAI_NETWORK_ERROR", async () => {
    await testOpenAIConnection({
      async createClient() {
        return {
          models: {
            async list() {
              throw new APIConnectionError({ message: "ECONNRESET" });
            },
            async retrieve(model: string) {
              return { id: model };
            }
          }
        };
      }
    });
  });

  console.log("OpenAI connectivity diagnostics tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


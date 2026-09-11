import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET as listProvidersGet } from "@/app/api/settings/providers/route";
import {
  DELETE as providerDelete,
  GET as providerGet,
  PUT as providerPut
} from "@/app/api/settings/providers/[providerId]/route";
import { POST as providerTestPost } from "@/app/api/settings/providers/[providerId]/test/route";
import {
  getProviderStatus,
  resolveProviderCredential,
  saveProviderCredential
} from "@/lib/providers/provider-resolver";
import { useProjectStore } from "@/stores/project-store";

const openAIKeyPrefix = ["s", "k"].join("");
const localKeyOne = `${openAIKeyPrefix}-localproviderabcdefghijklmnopqrstuvwxyz123456`;
const localKeyTwo = `${openAIKeyPrefix}-localproviderreplacementabcdefghijklmnopqrstuvwxyz`;
const environmentKey = `${openAIKeyPrefix}-envproviderabcdefghijklmnopqrstuvwxyz123456`;
const geminiKeyOne = "AIzaLocalGeminiProviderKey0123456789abcd";
const geminiKeyTwo = "AIzaLocalGeminiReplacementKey0123456789";

function requestJson(body: object) {
  return new Request("http://localhost/api/settings/providers/openai", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function context(providerId: string) {
  return {
    params: Promise.resolve({ providerId })
  };
}

async function responseJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

async function main() {
  const previousEnvKey = process.env.OPENAI_API_KEY;
  const previousSecretRoot = process.env.PROVIDER_SECRET_STORE_ROOT;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "outfit-provider-settings-"));
  process.env.PROVIDER_SECRET_STORE_ROOT = tempDir;
  delete process.env.OPENAI_API_KEY;

  try {
    const providersResponse = await responseJson(await listProvidersGet());
    const providers = providersResponse.providers as Array<{
      providerId: string;
      comingLater: boolean;
      mode: string;
      supportsCredential: boolean;
      capabilities: Record<string, boolean>;
    }>;
    assert.equal(providers.some((provider) => provider.providerId === "openai" && !provider.comingLater), true);
    assert.equal(
      providers.some(
        (provider) =>
          provider.providerId === "chatgpt_manual" &&
          !provider.comingLater &&
          provider.mode === "manual" &&
          !provider.supportsCredential &&
          provider.capabilities.manualGeneration
      ),
      true
    );
    assert.equal(
      providers.some(
        (provider) =>
          provider.providerId === "gemini" &&
          !provider.comingLater &&
          provider.mode === "api" &&
          provider.supportsCredential
      ),
      true
    );
    assert.equal(providers.some((provider) => provider.providerId === "stability" && provider.comingLater), true);
    assert.equal(providers.some((provider) => provider.providerId === "replicate" && provider.comingLater), true);

    const initialStatus = await getProviderStatus("openai");
    assert.equal(initialStatus.available, false);
    assert.equal(initialStatus.source, "none");

    const manualStatus = await getProviderStatus("chatgpt_manual");
    assert.equal(manualStatus.available, true);
    assert.equal(manualStatus.source, "none");
    assert.equal(manualStatus.supportsCredential, false);

    const manualSave = await responseJson(await providerPut(requestJson({ credential: localKeyOne }), context("chatgpt_manual")));
    assert.equal((manualSave.error as { code?: string } | undefined)?.code, "PROVIDER_CREDENTIAL_NOT_SUPPORTED");

    const manualTest = await responseJson(await providerTestPost(new Request("http://localhost/api"), context("chatgpt_manual")));
    assert.equal(manualTest.ok, true);

    const comingLaterSave = await responseJson(await providerPut(requestJson({ credential: localKeyOne }), context("stability")));
    assert.equal((comingLaterSave.error as { code?: string } | undefined)?.code, "PROVIDER_NOT_IMPLEMENTED");

    const missingConnection = await responseJson(await providerTestPost(new Request("http://localhost/api"), context("openai")));
    assert.equal((missingConnection.error as { code?: string } | undefined)?.code, "OPENAI_API_KEY_MISSING");

    const missingGeminiConnection = await responseJson(await providerTestPost(new Request("http://localhost/api"), context("gemini")));
    assert.equal((missingGeminiConnection.error as { code?: string } | undefined)?.code, "GEMINI_API_KEY_MISSING");

    const invalidResponse = await responseJson(await providerPut(requestJson({ credential: "" }), context("openai")));
    assert.equal((invalidResponse.error as { code?: string } | undefined)?.code, "INVALID_API_KEY_INPUT");

    const saveStateBefore = useProjectStore.getState().saveState;
    const saveResponse = await responseJson(await providerPut(requestJson({ credential: `  ${localKeyOne}  ` }), context("openai")));
    assert.equal(saveResponse.providerId, "openai");
    assert.equal(saveResponse.source, "local_secret_store");
    assert.equal(saveResponse.available, true);
    assert.equal(JSON.stringify(saveResponse).includes(localKeyOne), false);
    assert.match(String(saveResponse.maskedCredential), /^\*{12}3456$/);
    assert.equal(useProjectStore.getState().saveState, saveStateBefore);

    const geminiSaveResponse = await responseJson(await providerPut(requestJson({ credential: ` ${geminiKeyOne} ` }), context("gemini")));
    assert.equal(geminiSaveResponse.providerId, "gemini");
    assert.equal(geminiSaveResponse.source, "local_secret_store");
    assert.equal(geminiSaveResponse.available, true);
    assert.equal(JSON.stringify(geminiSaveResponse).includes(geminiKeyOne), false);
    assert.match(String(geminiSaveResponse.maskedCredential), /^\*{12}abcd$/);

    const geminiStoredSecret = await readFile(path.join(tempDir, "gemini.json"), "utf8");
    assert.equal(geminiStoredSecret.includes(geminiKeyOne), true);
    assert.equal(geminiStoredSecret.includes('"providerId": "gemini"'), true);

    const geminiGetResponse = await responseJson(await providerGet(new Request("http://localhost/api"), context("gemini")));
    assert.equal(geminiGetResponse.source, "local_secret_store");
    assert.equal(JSON.stringify(geminiGetResponse).includes(geminiKeyOne), false);

    const geminiReplaceStatus = await saveProviderCredential("gemini", geminiKeyTwo);
    assert.equal(geminiReplaceStatus.source, "local_secret_store");
    assert.equal((await resolveProviderCredential("gemini")).credential, geminiKeyTwo);

    const geminiRemoveResponse = await responseJson(await providerDelete(new Request("http://localhost/api"), context("gemini")));
    assert.equal(geminiRemoveResponse.source, "none");
    assert.equal(existsSync(path.join(tempDir, "gemini.json")), false);

    const storedSecret = await readFile(path.join(tempDir, "openai.json"), "utf8");
    assert.equal(storedSecret.includes(localKeyOne), true);
    assert.equal(storedSecret.includes('"providerId": "openai"'), true);

    const getResponse = await responseJson(await providerGet(new Request("http://localhost/api"), context("openai")));
    assert.equal(getResponse.source, "local_secret_store");
    assert.equal(JSON.stringify(getResponse).includes(localKeyOne), false);

    const resolvedLocal = await resolveProviderCredential("openai");
    assert.equal(resolvedLocal.credential, localKeyOne);
    assert.equal(resolvedLocal.source, "local_secret_store");

    const replaceStatus = await saveProviderCredential("openai", localKeyTwo);
    assert.equal(replaceStatus.source, "local_secret_store");
    assert.equal((await resolveProviderCredential("openai")).credential, localKeyTwo);

    process.env.OPENAI_API_KEY = environmentKey;
    const envStatus = await getProviderStatus("openai");
    assert.equal(envStatus.source, "environment");
    assert.equal(envStatus.maskedCredential, undefined);
    assert.equal((await resolveProviderCredential("openai")).credential, environmentKey);

    const envDeleteResponse = await responseJson(await providerDelete(new Request("http://localhost/api"), context("openai")));
    assert.equal(envDeleteResponse.source, "environment");
    assert.equal(String(envDeleteResponse.message).includes("Environment configuration remains active"), true);
    assert.equal(existsSync(path.join(tempDir, "openai.json")), true);

    delete process.env.OPENAI_API_KEY;
    const removeResponse = await responseJson(await providerDelete(new Request("http://localhost/api"), context("openai")));
    assert.equal(removeResponse.source, "none");
    assert.equal(existsSync(path.join(tempDir, "openai.json")), false);

    const gitignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
    assert.match(gitignore, /data\/secrets\/\*/);

    const dbSchema = readFileSync(path.join(process.cwd(), "src", "lib", "db", "schema.ts"), "utf8");
    assert.doesNotMatch(dbSchema, /provider.*credential|provider.*key|OPENAI_API_KEY/);

    const debugPanel = readFileSync(path.join(process.cwd(), "src", "components", "workflow", "debug-panel.tsx"), "utf8");
    assert.doesNotMatch(debugPanel, /maskedCredential|apiKey|OPENAI_API_KEY/);
  } finally {
    if (previousEnvKey) {
      process.env.OPENAI_API_KEY = previousEnvKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    if (previousSecretRoot) {
      process.env.PROVIDER_SECRET_STORE_ROOT = previousSecretRoot;
    } else {
      delete process.env.PROVIDER_SECRET_STORE_ROOT;
    }

    await rm(tempDir, { recursive: true, force: true });
  }

  console.log("Provider settings tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


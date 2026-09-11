import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProviderId } from "@/lib/providers/provider-types";
import { ProviderSettingsError } from "@/lib/providers/provider-types";

interface ProviderSecretFile {
  credential?: unknown;
  providerId?: unknown;
  updatedAt?: unknown;
}

function secretRootDirectory() {
  return process.env.PROVIDER_SECRET_STORE_ROOT?.trim() || path.join(process.cwd(), "data", "secrets", "providers");
}

function secretFilePath(providerId: ProviderId) {
  return path.join(secretRootDirectory(), `${providerId}.json`);
}

export async function readProviderSecret(providerId: ProviderId) {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ secretFilePath(providerId), "utf8");
    const parsed = JSON.parse(raw) as ProviderSecretFile;

    return typeof parsed.credential === "string" && parsed.credential.trim() ? parsed.credential.trim() : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw new ProviderSettingsError("PROVIDER_SECRET_READ_FAILED", "Could not read local provider settings.", 500);
  }
}

export async function writeProviderSecret(providerId: ProviderId, credential: string) {
  try {
    await mkdir(secretRootDirectory(), { recursive: true });
    await writeFile(
      /* turbopackIgnore: true */
      secretFilePath(providerId),
      JSON.stringify(
        {
          providerId,
          credential,
          updatedAt: new Date().toISOString()
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    throw new ProviderSettingsError("PROVIDER_SECRET_WRITE_FAILED", "Could not save local provider settings.", 500);
  }
}

export async function removeProviderSecret(providerId: ProviderId) {
  try {
    await rm(/* turbopackIgnore: true */ secretFilePath(providerId), { force: true });
  } catch {
    throw new ProviderSettingsError("PROVIDER_SECRET_REMOVE_FAILED", "Could not remove local provider settings.", 500);
  }
}

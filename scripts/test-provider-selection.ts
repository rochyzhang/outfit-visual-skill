import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defaultGenerationProviderId, generationProviderOptions } from "@/config/generation-providers";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { snapshotKey, validateWorkflowSnapshot, workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import { useProjectStore } from "@/stores/project-store";
import { createDefaultWorkflowState, useWorkflowStore } from "@/stores/workflow-store";

const optionIds = generationProviderOptions.map((provider) => provider.value);
assert.deepEqual(optionIds, ["openai", "chatgpt_manual", "gemini"]);
assert.equal(defaultGenerationProviderId, "chatgpt_manual");

const defaultWorkflow = createDefaultWorkflowState();
assert.equal(defaultWorkflow.output.providerId, "chatgpt_manual");
assert.equal(buildGenerationConfig(defaultWorkflow).provider.value, "chatgpt_manual");

const geminiWorkflow = {
  ...defaultWorkflow,
  output: {
    ...defaultWorkflow.output,
    providerId: "gemini" as const
  }
};
const geminiSnapshot = workflowDraftToSnapshot(geminiWorkflow);
assert.equal(geminiSnapshot.output.providerId, "gemini");
assert.equal(validateWorkflowSnapshot(geminiSnapshot).snapshot.output.providerId, "gemini");

const legacySnapshot = {
  ...geminiSnapshot,
  output: {
    aspectRatio: "3:4",
    count: 1,
    quality: "standard",
    mode: "single"
  }
};
const legacyValidation = validateWorkflowSnapshot(legacySnapshot);
assert.equal(legacyValidation.snapshot.output.providerId, "chatgpt_manual");
assert.equal(legacyValidation.warnings.some((warning) => warning.includes("Generation provider")), false);

const invalidSnapshot = {
  ...geminiSnapshot,
  output: {
    ...geminiSnapshot.output,
    providerId: "unknown_provider"
  }
};
const invalidValidation = validateWorkflowSnapshot(invalidSnapshot);
assert.equal(invalidValidation.snapshot.output.providerId, "chatgpt_manual");
assert.equal(invalidValidation.warnings.some((warning) => warning.includes("Generation provider")), true);

useWorkflowStore.setState(createDefaultWorkflowState());
const savedKey = snapshotKey(workflowDraftToSnapshot(useWorkflowStore.getState().getWorkflowDraft()));
useProjectStore.getState().hydrateProject({
  project: {
    id: "provider-selection-project",
    name: "Provider Selection Test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  workflowVersion: 1,
  warnings: [],
  lastSavedSnapshotKey: savedKey
});
assert.equal(useProjectStore.getState().saveState, "saved");

useWorkflowStore.getState().setGenerationProvider("gemini");
const changedKey = snapshotKey(workflowDraftToSnapshot(useWorkflowStore.getState().getWorkflowDraft()));
assert.notEqual(changedKey, savedKey);
useProjectStore.getState().markUnsaved();
assert.equal(useProjectStore.getState().saveState, "unsaved");

const settingsPanel = readFileSync(path.join(process.cwd(), "src", "features", "settings", "settings-panel.tsx"), "utf8");
assert.match(settingsPanel, /View Manual Flow/);
assert.match(settingsPanel, /provider\.supportsCredential/);
assert.doesNotMatch(settingsPanel, /chatgpt_manual[\s\S]{0,80}API Key/);

const generateModule = readFileSync(path.join(process.cwd(), "src", "features", "generation", "generate-module.tsx"), "utf8");
assert.match(generateModule, /Provider/);
assert.match(generateModule, /No image generation API call is made/);

const resultModule = readFileSync(path.join(process.cwd(), "src", "features", "generation", "result-module.tsx"), "utf8");
assert.match(resultModule, /Import Result/);
assert.match(resultModule, /chatgpt_manual/);
assert.doesNotMatch(resultModule, /generateContent|responses\.create|fetch\(["']https?:/i);

const providerClient = readFileSync(path.join(process.cwd(), "src", "features", "settings", "provider-settings-client.ts"), "utf8");
assert.doesNotMatch(providerClient, /localStorage|sessionStorage|indexedDB/i);

console.log("Provider selection tests passed.");

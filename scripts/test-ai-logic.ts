import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { POST as analyzeSceneReferencePost } from "@/app/api/ai/analyze-scene-reference/route";
import { POST as refineScenePost } from "@/app/api/ai/refine-scene/route";
import { sceneReferenceAnalysisSchema, sceneRefinementSchema } from "@/features/ai/ai-schemas";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { persistAssetForCurrentProject } from "@/lib/projects/project-repository";
import { createDefaultWorkflowState } from "@/stores/workflow-store";
import type { Asset, WorkflowDraft } from "@/types/domain";

function requestJson(body: object) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function responseJson(response: Response) {
  return (await response.json()) as {
    error?: {
      code?: string;
      message?: string;
    };
  };
}

function validSceneRefinement() {
  return {
    originalIntent: "quiet Tokyo vintage storefront",
    environment: "minimal urban Japanese side street",
    background: "clean storefront facade with limited signage",
    surface: "concrete sidewalk",
    spatialContext: "shallow street-side environment behind outfit",
    desiredMood: "quiet weekend editorial",
    includeElements: ["clean facade", "subtle street texture"],
    excludeElements: ["crowds", "busy signs"],
    refinedScenePrompt: "Quiet minimal Tokyo vintage storefront exterior with a clean facade, concrete sidewalk, and restrained street detail.",
    lookNotes: {
      lighting: "soft daylight",
      color: "muted neutrals",
      mood: "calm"
    },
    warnings: []
  };
}

function validSceneAnalysis() {
  return {
    environment: {
      type: "indoor studio corner",
      background: "plain plaster wall",
      surface: "matte floor",
      spatialContext: "simple wall-floor intersection",
      visibleProps: ["low block"]
    },
    lighting: {
      direction: "left side",
      softness: "soft",
      intensity: "medium",
      naturalVsArtificial: "natural-looking artificial"
    },
    color: {
      dominantPalette: ["warm white", "stone gray"],
      saturation: "low",
      temperature: "neutral warm"
    },
    texture: {
      backgroundTexture: "smooth plaster",
      photographicTexture: "clean editorial"
    },
    mood: "calm and restrained",
    compositionNotes: ["uncluttered scene plane"],
    scenePromptSuggestion: "Minimal indoor studio corner with a plain plaster wall, matte floor, and one low block prop.",
    lookSuggestions: {
      lighting: "soft side light",
      color: "warm neutral palette",
      contrast: "low-medium contrast",
      texture: "smooth wall texture",
      mood: "quiet editorial"
    },
    warnings: []
  };
}

async function testApiErrors() {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousSecretRoot = process.env.PROVIDER_SECRET_STORE_ROOT;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "outfit-ai-missing-provider-"));
  process.env.PROVIDER_SECRET_STORE_ROOT = tempDir;
  delete process.env.OPENAI_API_KEY;

  try {
    const emptyResponse = await refineScenePost(requestJson({ customPrompt: "   " }));
    const emptyPayload = await responseJson(emptyResponse);
    assert.equal(emptyResponse.status, 400);
    assert.equal(emptyPayload.error?.code, "EMPTY_CUSTOM_PROMPT");

    const missingKeyResponse = await refineScenePost(requestJson({ customPrompt: "quiet rooftop" }));
    const missingKeyText = JSON.stringify(await responseJson(missingKeyResponse));
    assert.equal(missingKeyResponse.status, 503);
    assert.match(missingKeyText, /OPENAI_API_KEY_MISSING/);
    assert.doesNotMatch(missingKeyText, /TEST_SECRET_LEAK_VALUE/);
    assert.doesNotMatch(missingKeyText, new RegExp(path.resolve(process.cwd()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const missingAssetResponse = await analyzeSceneReferencePost(requestJson({ assetId: crypto.randomUUID() }));
    const missingAssetPayload = await responseJson(missingAssetResponse);
    assert.equal(missingAssetResponse.status, 404);
    assert.equal(missingAssetPayload.error?.code, "ASSET_NOT_FOUND");

    const productAsset: Asset = {
      id: crypto.randomUUID(),
      type: "product",
      fileName: `product-${crypto.randomUUID()}.webp`,
      originalFileName: "test-product.webp",
      relativePath: "assets/test-product.webp",
      publicUrl: "/api/assets/test-product.webp",
      mimeType: "image/webp",
      sizeBytes: 42,
      width: 1,
      height: 1,
      createdAt: new Date().toISOString()
    };
    await persistAssetForCurrentProject(productAsset);
    const invalidReferenceResponse = await analyzeSceneReferencePost(requestJson({ assetId: productAsset.id }));
    const invalidReferencePayload = await responseJson(invalidReferenceResponse);
    assert.equal(invalidReferenceResponse.status, 400);
    assert.equal(invalidReferencePayload.error?.code, "INVALID_SCENE_REFERENCE");
  } finally {
    if (previousKey) {
      process.env.OPENAI_API_KEY = previousKey;
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
}

function testSchemas() {
  assert.equal(sceneRefinementSchema.safeParse(validSceneRefinement()).success, true);
  assert.equal(sceneRefinementSchema.safeParse({ refinedScenePrompt: "missing fields" }).success, false);
  assert.equal(sceneReferenceAnalysisSchema.safeParse(validSceneAnalysis()).success, true);
}

function testWorkflowAcceptance() {
  const original = "raw rooftop with city feeling";
  const refined = validSceneRefinement().refinedScenePrompt;
  const draft: WorkflowDraft = {
    ...createDefaultWorkflowState(),
    scene: {
      preset: "S06",
      reference: null,
      customPrompt: original
    }
  };

  assert.equal(draft.scene.customPrompt, original);
  assert.equal(buildGenerationConfig(draft).promptFragments.scene, original);

  const approvedDraft: WorkflowDraft = {
    ...draft,
    scene: {
      ...draft.scene,
      customPrompt: refined
    }
  };
  const config = buildGenerationConfig(approvedDraft);
  const plan = compileGenerationPlan(config);
  const qa = validateGenerationPlan(plan, config);

  assert.equal(config.promptFragments.scene, refined);
  assert.match(plan.finalPrompt, /Quiet minimal Tokyo vintage storefront/);
  assert.notEqual(qa.status, "fail");

  const analysisDraft: WorkflowDraft = {
    ...createDefaultWorkflowState(),
    scene: {
      preset: "S01",
      reference: null,
      customPrompt: ""
    }
  };
  const beforePreset = analysisDraft.scene.preset;
  sceneReferenceAnalysisSchema.parse(validSceneAnalysis());
  assert.equal(analysisDraft.scene.preset, beforePreset);
}

function testDeterministicIsolation() {
  const isolatedFiles = [
    "src/features/generation/build-generation-config.ts",
    "src/features/prompt-compiler/compile-generation-plan.ts",
    "src/features/prompt-compiler/validate-generation-plan.ts"
  ];

  for (const file of isolatedFiles) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    assert.doesNotMatch(source, /from ["']openai/, `${file} must not import the OpenAI SDK`);
    assert.doesNotMatch(source, /@\/lib\/openai|@\/lib\/ai/, `${file} must not import AI services`);
    assert.doesNotMatch(source, /getOpenAIClient|responses\.parse|responses\.create/, `${file} must not call AI APIs`);
  }
}

async function main() {
  testSchemas();
  testWorkflowAcceptance();
  testDeterministicIsolation();
  await testApiErrors();

  console.log("AI logic tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


import assert from "node:assert/strict";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import type {
  Asset,
  CompositionPresetId,
  ContentTypeId,
  GenerationConfig,
  GraphicPresetId,
  LookPresetId,
  ScenePresetId,
  WorkflowDraft
} from "@/types/domain";

const productAsset: Asset = {
  id: "product-qa-asset",
  type: "product",
  fileName: "product-qa-asset.png",
  originalFileName: "top.png",
  relativePath: "assets/product-qa-asset.png",
  publicUrl: "/api/assets/product-qa-asset.png",
  mimeType: "image/png",
  sizeBytes: 70,
  width: 1,
  height: 1,
  createdAt: "2026-08-25T00:00:00.000Z"
};

const shoesAsset: Asset = {
  ...productAsset,
  id: "product-qa-shoes",
  fileName: "product-qa-shoes.png",
  originalFileName: "shoes.png",
  publicUrl: "/api/assets/product-qa-shoes.png"
};

function createWorkflow(overrides: {
  contentType?: ContentTypeId;
  productFidelity?: boolean;
  scene?: ScenePresetId;
  customPrompt?: string;
  composition?: CompositionPresetId;
  graphic?: GraphicPresetId;
  look?: LookPresetId;
  includeTop?: boolean;
  includeShoes?: boolean;
} = {}): WorkflowDraft {
  return {
    contentType: overrides.contentType ?? "genderless",
    productFidelity: overrides.productFidelity ?? true,
    outfitSlots: {
      hat: null,
      glasses: null,
      neck: null,
      inner: null,
      top: overrides.includeTop === false ? null : productAsset,
      outer: null,
      bottom: null,
      socks: null,
      shoes: overrides.includeShoes ? shoesAsset : null,
      bag: null,
      accessory01: null,
      accessory02: null,
      prop01: null,
      prop02: null
    },
    scene: {
      preset: overrides.scene ?? "S01",
      reference: null,
      customPrompt: overrides.customPrompt ?? ""
    },
    composition: {
      preset: overrides.composition ?? "C02",
      graphic: overrides.graphic ?? "None"
    },
    look: overrides.look ?? "L01",
    output: {
      providerId: "chatgpt_manual",
      aspectRatio: "3:4",
      count: 1,
      quality: "high",
      mode: "single"
    }
  };
}

function compile(overrides?: Parameters<typeof createWorkflow>[0]) {
  const config = buildGenerationConfig(createWorkflow(overrides));
  const plan = compileGenerationPlan(config);
  return { config, plan, qa: validateGenerationPlan(plan, config) };
}

function issueCodes(result: ReturnType<typeof compile>["qa"]) {
  return result.issues.map((item) => item.code);
}

function withPlanMutation(input: ReturnType<typeof compile>, mutate: (plan: ReturnType<typeof compile>["plan"]) => void) {
  mutate(input.plan);
  input.plan.finalPrompt = `${input.plan.finalPrompt}\n${Object.values(input.plan.instructions).join("\n")}`;
  return validateGenerationPlan(input.plan, input.config);
}

const combinationA = compile({ scene: "S01", composition: "C02", look: "L01", includeShoes: true });
assert.notEqual(combinationA.qa.status, "fail");
assert.ok(!issueCodes(combinationA.qa).includes("SCENE_LOOK_CONFLICT"));

const combinationB = compile({ scene: "S03", composition: "C01", look: "L05", includeShoes: true });
assert.notEqual(combinationB.qa.status, "fail");
assert.ok(!issueCodes(combinationB.qa).includes("SCENE_LOOK_CONFLICT"));

const combinationC = compile({ scene: "S01", composition: "C05", look: "L03", graphic: "G04", includeShoes: true });
assert.notEqual(combinationC.qa.status, "fail");
assert.ok(!issueCodes(combinationC.qa).includes("SCENE_LOOK_CONFLICT"));
assert.doesNotMatch(combinationC.plan.finalPrompt, /burgundy physical background|deep red physical wall/i);

const combinationD = compile({
  scene: "S06",
  customPrompt: "minimal Tokyo apartment with plain plaster wall and no visible furniture",
  composition: "C03",
  look: "L01"
});
assert.notEqual(combinationD.qa.status, "fail");
assert.match(combinationD.plan.instructions.scene, /minimal Tokyo apartment/);

const sceneLookConflict = compile({ scene: "S01", look: "L03" });
const sceneLookQA = withPlanMutation(sceneLookConflict, (plan) => {
  plan.instructions.color = `${plan.instructions.color}, deep burgundy fabric backdrop`;
});
assert.ok(issueCodes(sceneLookQA).includes("SCENE_LOOK_CONFLICT"));

const productConflict = compile({ productFidelity: true });
const productConflictQA = withPlanMutation(productConflict, (plan) => {
  plan.instructions.scene = `${plan.instructions.scene} Change the blue jeans to black trousers.`;
});
assert.ok(issueCodes(productConflictQA).includes("PRODUCT_FIDELITY_CONFLICT"));

const graphicInvention = compile({ graphic: "G04" });
const graphicInventionQA = withPlanMutation(graphicInvention, (plan) => {
  plan.instructions.graphic = `${plan.instructions.graphic} Add 30% OFF sale label.`;
});
assert.ok(issueCodes(graphicInventionQA).includes("GRAPHIC_CONTENT_INVENTION"));

const windowsPath = compile();
windowsPath.plan.finalPrompt = `${windowsPath.plan.finalPrompt}\nD:\\Users\\example\\secret.png`;
assert.ok(issueCodes(validateGenerationPlan(windowsPath.plan, windowsPath.config)).includes("INTERNAL_PATH_LEAK"));

const blobPath = compile();
blobPath.plan.finalPrompt = `${blobPath.plan.finalPrompt}\nblob:http://localhost/image`;
assert.ok(issueCodes(validateGenerationPlan(blobPath.plan, blobPath.config)).includes("INTERNAL_PATH_LEAK"));

const duplicateStyle = compile();
const duplicateQA = withPlanMutation(duplicateStyle, (plan) => {
  plan.instructions.lighting = `${plan.instructions.lighting}, analog film grain`;
  plan.instructions.color = `${plan.instructions.color}, analog film grain`;
  plan.instructions.mood = `${plan.instructions.mood}, analog film grain`;
});
assert.ok(issueCodes(duplicateQA).includes("DUPLICATE_STYLE_WEIGHT"));

const compositionMismatch = compile({ composition: "C01" });
const compositionMismatchQA = withPlanMutation(compositionMismatch, (plan) => {
  plan.instructions.composition = `${plan.instructions.composition} Visible full-body model standing inside the outfit.`;
});
assert.ok(issueCodes(compositionMismatchQA).includes("COMPOSITION_REQUIREMENT_MISMATCH"));

const normalDynamicInvisible = compile({ composition: "C04", includeShoes: true });
assert.equal(normalDynamicInvisible.plan.revision, undefined);
assert.equal(normalDynamicInvisible.plan.instructions.revision, null);
assert.ok(!issueCodes(normalDynamicInvisible.qa).includes("EMPTY_REVISION"));
assert.ok(!issueCodes(normalDynamicInvisible.qa).includes("REVISION_SCOPE_CONFLICT"));
assert.ok(!issueCodes(normalDynamicInvisible.qa).includes("COMPOSITION_REQUIREMENT_MISMATCH"));

const normalGarmentInstruction = compile();
const normalGarmentInstructionQA = withPlanMutation(normalGarmentInstruction, (plan) => {
  plan.instructions.scene = `${plan.instructions.scene} Change the jacket to a red leather jacket.`;
});
assert.ok(issueCodes(normalGarmentInstructionQA).includes("PRODUCT_FIDELITY_CONFLICT"));
assert.ok(!issueCodes(normalGarmentInstructionQA).includes("REVISION_SCOPE_CONFLICT"));

const validRevisionConfig = buildGenerationConfig(createWorkflow({ includeShoes: true })) satisfies GenerationConfig;
const validRevisionPlan = compileGenerationPlan(validRevisionConfig, {
  revision: {
    parentGenerationId: "parent-generation-valid",
    revisionType: "pose",
    instruction: "Keep everything else unchanged. Change only the pose to a relaxed walking pose.",
    preserveUnchanged: true
  }
});
const validRevisionQA = validateGenerationPlan(validRevisionPlan, validRevisionConfig);
assert.match(validRevisionPlan.finalPrompt, /\[14 REVISION\]/);
assert.ok(!issueCodes(validRevisionQA).includes("EMPTY_REVISION"));
assert.ok(!issueCodes(validRevisionQA).includes("REVISION_SCOPE_CONFLICT"));

const emptyRevisionPlan = compileGenerationPlan(validRevisionConfig, {
  revision: {
    parentGenerationId: "parent-generation-empty",
    revisionType: "pose",
    instruction: "",
    preserveUnchanged: true
  }
});
assert.ok(issueCodes(validateGenerationPlan(emptyRevisionPlan, validRevisionConfig)).includes("EMPTY_REVISION"));

const poseProductConflictPlan = compileGenerationPlan(validRevisionConfig, {
  revision: {
    parentGenerationId: "parent-generation-conflict",
    revisionType: "pose",
    instruction: "Change the jacket into a red leather jacket.",
    preserveUnchanged: true
  }
});
assert.ok(issueCodes(validateGenerationPlan(poseProductConflictPlan, validRevisionConfig)).includes("REVISION_SCOPE_CONFLICT"));

const noProducts = compile({ includeTop: false, includeShoes: false });
assert.ok(issueCodes(noProducts.qa).includes("NO_PRODUCTS"));

const missingShoes = compile({ composition: "C04", includeShoes: false });
assert.ok(issueCodes(missingShoes.qa).includes("MISSING_CORE_PRODUCT"));

const missingSection = compile();
missingSection.plan.finalPrompt = missingSection.plan.finalPrompt.replace(/\[14 OUTPUT\][\s\S]*?\n\n/, "");
assert.ok(issueCodes(validateGenerationPlan(missingSection.plan, missingSection.config)).includes("EMPTY_REQUIRED_SECTION"));

const secretLeak = compile();
secretLeak.plan.finalPrompt = `${secretLeak.plan.finalPrompt}\nOPENAI_API_KEY=TEST_SECRET_SHOULD_NOT_LEAK`;
assert.ok(issueCodes(validateGenerationPlan(secretLeak.plan, secretLeak.config)).includes("SECRET_LEAK_PATTERN"));

const config = buildGenerationConfig(createWorkflow()) satisfies GenerationConfig;
const qa = validateGenerationPlan(compileGenerationPlan(config), config);
assert.equal(qa.metrics.sectionCount, 14);
assert.ok(qa.metrics.promptLength > 0);

console.log("Prompt QA deterministic tests passed.");


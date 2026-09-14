import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { graphicPresets } from "@/config/presets/graphics";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { buildManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import type { Asset, CompositionPresetId, ContentTypeId, GraphicPresetId, LookPresetId, ScenePresetId, WorkflowDraft } from "@/types/domain";

const productAsset: Asset = {
  id: "product-test-asset",
  type: "product",
  fileName: "product-test-asset.png",
  originalFileName: "top.png",
  relativePath: "assets/product-test-asset.png",
  publicUrl: "/api/assets/product-test-asset.png",
  mimeType: "image/png",
  sizeBytes: 70,
  width: 1,
  height: 1,
  createdAt: "2026-08-25T00:00:00.000Z"
};

function createWorkflow(overrides: {
  contentType?: ContentTypeId;
  productFidelity?: boolean;
  selectedSkillId?: WorkflowDraft["selectedSkillId"];
  scene?: ScenePresetId;
  customPrompt?: string;
  composition?: CompositionPresetId;
  graphic?: GraphicPresetId;
  look?: LookPresetId;
  withProduct?: boolean;
} = {}): WorkflowDraft {
  return {
    selectedSkillId: overrides.selectedSkillId ?? null,
    contentType: overrides.contentType ?? "genderless",
    productFidelity: overrides.productFidelity ?? true,
    outfitSlots: {
      hat: null,
      glasses: null,
      neck: null,
      inner: null,
      top: overrides.withProduct === false ? null : productAsset,
      outer: null,
      bottom: null,
      socks: null,
      shoes: null,
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
      preset: overrides.composition ?? "C01",
      graphic: overrides.graphic ?? "None"
    },
    look: overrides.look ?? "L01",
    output: {
      providerId: "chatgpt_manual",
      aspectRatio: "3:4",
      count: 1,
      quality: "standard",
      mode: "single"
    }
  };
}

function plan(overrides?: Parameters<typeof createWorkflow>[0]) {
  return compileGenerationPlan(buildGenerationConfig(createWorkflow(overrides)));
}

function section(finalPrompt: string, heading: string) {
  const start = finalPrompt.indexOf(`[${heading}]`);

  assert.notEqual(start, -1, `Missing section ${heading}`);

  const rest = finalPrompt.slice(start + heading.length + 2);
  const next = rest.search(/\n\n\[\d{2} /);
  return next === -1 ? rest.trim() : rest.slice(0, next).trim();
}

function productionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return productionFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

const baseline = plan();
assert.equal(baseline.finalPrompt, plan().finalPrompt, "same config must produce same prompt");
assert.match(baseline.finalPrompt, /\[01 TASK\][\s\S]+\[15 NEGATIVE \/ PROHIBITED BEHAVIOR\]/);
assert.doesNotMatch(baseline.finalPrompt, /blob:|D:|data\/outfit-visual-studio\.db/);
assert.match(baseline.finalPrompt, /Preserve each uploaded item's original silhouette/);
assert.match(baseline.finalPrompt, /no visible body/i);

const lookChanged = plan({ look: "L03" });
assert.equal(section(baseline.finalPrompt, "04 COMPOSITION"), section(lookChanged.finalPrompt, "04 COMPOSITION"));
assert.notEqual(section(baseline.finalPrompt, "08 LIGHTING"), section(lookChanged.finalPrompt, "08 LIGHTING"));

const sceneChanged = plan({ scene: "S03" });
assert.notEqual(section(baseline.finalPrompt, "06 SCENE"), section(sceneChanged.finalPrompt, "06 SCENE"));
assert.equal(section(baseline.finalPrompt, "08 LIGHTING"), section(sceneChanged.finalPrompt, "08 LIGHTING"));

const whiteBurgundy = plan({ scene: "S01", look: "L03", composition: "C05" });
assert.match(section(whiteBurgundy.finalPrompt, "06 SCENE"), /warm-white seamless studio/);
assert.doesNotMatch(section(whiteBurgundy.finalPrompt, "06 SCENE"), /burgundy/i);
assert.doesNotMatch(section(whiteBurgundy.finalPrompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /No visible human body/);

const custom = plan({ scene: "S06", customPrompt: "minimal Tokyo apartment with plain plaster wall and no visible furniture", composition: "C03" });
assert.match(section(custom.finalPrompt, "06 SCENE"), /minimal Tokyo apartment/);

const emptyCustom = plan({ scene: "S06", customPrompt: "" });
assert.ok(emptyCustom.warnings.includes("Custom Scene is selected but custom prompt is empty."));

const fidelityOff = plan({ productFidelity: false });
assert.doesNotMatch(fidelityOff.finalPrompt, /Preserve each uploaded item's original silhouette/);
assert.match(fidelityOff.finalPrompt, /references define the intended outfit/);

assert.deepEqual(graphicPresets.map((preset) => preset.id), ["None", "G01", "G02", "G03", "G04"]);
const koreanStreetGraphic = graphicPresets.find((preset) => preset.id === "G02");
assert.equal(koreanStreetGraphic?.name, "Korean Street");
assert.match(koreanStreetGraphic?.promptFragment ?? "", /Korean independent streetwear and Seoul editorial graphic language/);
assert.match(koreanStreetGraphic?.promptFragment ?? "", /English-only editorial annotations and labels/);
assert.match(koreanStreetGraphic?.promptFragment ?? "", /do not use Hangul or Korean-language text/i);

const noGraphicPrompt = plan({ graphic: "None" }).finalPrompt;
assert.doesNotMatch(noGraphicPrompt, /GRAPHIC OVERLAY/);
assert.doesNotMatch(noGraphicPrompt, /visible text|annotations|labels/i);

const koreanStreetPrompt = plan({ graphic: "G02" }).finalPrompt;
assert.match(koreanStreetPrompt, /Korean independent streetwear and Seoul editorial graphic language/);
assert.match(koreanStreetPrompt, /English-only editorial annotations and labels/);
assert.match(koreanStreetPrompt, /All visible text, labels, annotations, captions, and handwritten notes in the generated image must be in English only/);
assert.doesNotMatch(koreanStreetPrompt, /Korean handwritten|Hangul text|Korean-language output/i);
assert.match(plan({ graphic: "G04" }).finalPrompt, /English editorial fashion catalog typography inspired by Japanese magazine layout/);
assert.match(plan({ composition: "C02" }).finalPrompt, /top-down fashion flat lay/);
assert.match(plan({ composition: "C03" }).finalPrompt, /chair or object/);
assert.match(plan({ composition: "C04" }).finalPrompt, /invisible person in motion/);
const sk02Composition = section(
  plan({ selectedSkillId: "SK02_INVISIBLE_EDITORIAL", composition: "C04", scene: "S05", look: "L03" }).finalPrompt,
  "04 COMPOSITION"
);
assert.match(sk02Composition, /invisible person in motion/);
assert.match(sk02Composition, /dynamic garment articulation/);
assert.doesNotMatch(sk02Composition, /flat 2D human-silhouette outfit editorial/);
const sk06Prompt = plan({
  selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL",
  scene: "S02",
  composition: "C04",
  graphic: "G02",
  look: "L01"
}).finalPrompt;
assert.match(section(sk06Prompt, "04 COMPOSITION"), /flat 2D human-silhouette outfit editorial/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Preserve one coherent head-to-toe outfit relationship/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as a product breakdown/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /scattered independent items/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create SK02's strong 3D invisible walking-body presentation/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not scatter garments into independent product tiles, a full product breakdown, or a generic catalog grid/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /No Hangul, Korean characters, or fake Korean visible text/);
assert.doesNotMatch(plan({ composition: "C05" }).finalPrompt, /No visible human body/);
assert.ok(plan({ withProduct: false }).warnings.includes("No products uploaded."));
assert.ok(plan({ contentType: "couple" }).warnings.includes("Couple content type is selected, but V1 currently contains one outfit set."));

const revisionPlan = compileGenerationPlan(buildGenerationConfig(createWorkflow({ graphic: "G02" })), {
  revision: {
    parentGenerationId: "parent-generation",
    revisionType: "pose",
    instruction: "Change only the pose to a relaxed walking pose.",
    preserveUnchanged: true
  }
});
assert.match(revisionPlan.finalPrompt, /\[14 REVISION\]/);
assert.match(revisionPlan.finalPrompt, /All visible text, labels, annotations, captions, and handwritten notes in the generated image must be in English only/);

const manualConfig = buildGenerationConfig(createWorkflow({ graphic: "G02" }));
const manualPlan = compileGenerationPlan(manualConfig);
const manualPackage = buildManualGenerationPackage(manualConfig, manualPlan, validateGenerationPlan(manualPlan, manualConfig));
assert.match(manualPackage.fullPackageText, /English-only editorial annotations and labels/);

const productionPromptFiles = [
  ...productionFiles(path.join(process.cwd(), "src", "config")),
  ...productionFiles(path.join(process.cwd(), "src", "features", "prompt-compiler")),
  path.join(process.cwd(), "src", "features", "generation", "manual-generation-package.ts")
];
for (const filePath of productionPromptFiles) {
  assert.doesNotMatch(readFileSync(filePath, "utf8"), /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/u, `Hangul found in ${path.relative(process.cwd(), filePath)}`);
}

console.log("Prompt compiler deterministic tests passed.");

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
const sk01Prompt = plan({ selectedSkillId: "SK01_MINIMAL_FLAT_LAY", scene: "S01", composition: "C02", look: "L02" }).finalPrompt;
assert.match(section(sk01Prompt, "04 COMPOSITION"), /realistic minimal flat lay/);
assert.match(section(sk01Prompt, "04 COMPOSITION"), /casual but intentional placement/);
assert.match(section(sk01Prompt, "04 COMPOSITION"), /mild overlap, rhythm, visual hierarchy/);
assert.match(section(sk01Prompt, "04 COMPOSITION"), /not evenly separated, pasted-on, floating, or disconnected/);
assert.match(section(sk01Prompt, "06 SCENE"), /approved 01 visual reference/);
assert.match(section(sk01Prompt, "06 SCENE"), /slightly cooler clean neutral-grey cement or concrete indoor floor/);
assert.match(section(sk01Prompt, "06 SCENE"), /subtle natural floor texture/);
assert.match(section(sk01Prompt, "06 SCENE"), /airy and clean but not empty-white studio backdrop/);
assert.match(section(sk01Prompt, "06 SCENE"), /Keep product colors faithful while cooling and cleaning only the environment/);
assert.match(section(sk01Prompt, "06 SCENE"), /real indoor still-life photography feel/);
assert.match(section(sk01Prompt, "06 SCENE"), /brownish-grey or muddy grey cast/);
assert.match(section(sk01Prompt, "06 SCENE"), /overly contrasty floor texture/);
assert.match(section(sk01Prompt, "07 CAMERA"), /true overhead \/ top-down photography/);
assert.match(section(sk01Prompt, "07 CAMERA"), /85-90 degree downward camera angle/);
assert.match(section(sk01Prompt, "08 LIGHTING"), /soft low-saturation natural daylight/);
assert.match(section(sk01Prompt, "08 LIGHTING"), /soft-edged shadows/);
assert.match(section(sk01Prompt, "09 COLOR"), /slightly cooler clean neutral-grey concrete\/cement environment/);
assert.match(section(sk01Prompt, "09 COLOR"), /low yellow warmth/);
assert.match(section(sk01Prompt, "09 COLOR"), /no brownish-grey or muddy grey cast/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /pure white cutout-on-background collage/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /sterile ecommerce white canvas/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /realistic indoor cement\/concrete floor feeling/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /warm beige floor appearance, brownish-grey or muddy grey cast/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /dirty warm cement tone/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /overly contrasty floor texture/);
const sk02Composition = section(
  plan({ selectedSkillId: "SK02_INVISIBLE_EDITORIAL", composition: "C02", scene: "S05", look: "L03" }).finalPrompt,
  "04 COMPOSITION"
);
const sk02Prompt = plan({ selectedSkillId: "SK02_INVISIBLE_EDITORIAL", composition: "C02", scene: "S05", look: "L03" }).finalPrompt;
assert.match(sk02Composition, /relaxed editorial floor-lay outfit presentation/);
assert.match(sk02Composition, /casually and naturally on the floor/);
assert.match(sk02Composition, /mild overlap, grounded contact shadows/);
assert.match(sk02Composition, /more lifestyle-like editorial rhythm than SK01/);
assert.match(sk02Composition, /human-absent and clothing-only/);
assert.match(sk02Composition, /do not imply a 3D human-body illusion/);
assert.doesNotMatch(sk02Composition, /invisible person in motion/);
assert.doesNotMatch(sk02Composition, /dynamic garment articulation/);
assert.doesNotMatch(sk02Composition, /reclining body arrangement/);
assert.doesNotMatch(sk02Composition, /flat 2D human-silhouette outfit editorial/);
assert.match(section(sk02Prompt, "06 SCENE"), /relaxed editorial floor-lay setting/);
assert.match(section(sk02Prompt, "06 SCENE"), /previous-round 01 result direction/);
assert.match(section(sk02Prompt, "06 SCENE"), /natural floor-based styling/);
assert.match(section(sk02Prompt, "06 SCENE"), /real photographed still-life feel/);
assert.match(section(sk02Prompt, "06 SCENE"), /not too white, sterile, warm, or icy/);
assert.match(section(sk02Prompt, "06 SCENE"), /Avoid pure white cutout canvas/);
assert.match(section(sk02Prompt, "06 SCENE"), /body-illusion staging, mannequin-like body structure/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /3D invisible-human impression/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /reclining or sprawled invisible-body arrangement/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /one visually dominant hero prop/);
assert.match(section(sk02Prompt, "08 LIGHTING"), /soft natural editorial daylight/);
assert.match(section(sk02Prompt, "08 LIGHTING"), /relaxed photographed still-life mood/);
assert.match(section(sk02Prompt, "09 COLOR"), /clean neutral floor-lay palette/);
assert.match(section(sk02Prompt, "09 COLOR"), /not too warm, not too icy/);
assert.match(section(sk02Prompt, "09 COLOR"), /not too white or sterile/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /No visible human body, face, skin, person, or mannequin/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create a body-shaped outfit illusion, 3D human-body structure/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not flatten SK02 into SK06's flat 2D human-silhouette presentation/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not turn SK02 into a product breakdown, generic flat lay, or prop-styling scene/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /relaxed, casual, and naturally photographed/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not add unnecessary furniture/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /warm yellow lighting, creamy beige dominance/);
assert.doesNotMatch(sk02Prompt, /prefer an invisible outfit lying/);
assert.doesNotMatch(sk02Prompt, /coherent reclining body arrangement/);
assert.doesNotMatch(sk02Prompt, /floor contact, and body weight/);

const sk04Prompt = plan({ selectedSkillId: "SK04_PROP_STYLING", composition: "C03", scene: "S01", look: "L02" }).finalPrompt;
assert.match(section(sk04Prompt, "04 COMPOSITION"), /one visually dominant hero chair/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /The outfit should interact naturally with that single anchor/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /prop should organize the outfit spatially/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Do not add secondary furniture or prop clusters/);
assert.match(section(sk04Prompt, "06 SCENE"), /cleaner, lighter grey-white indoor studio wall\/floor/);
assert.match(section(sk04Prompt, "06 SCENE"), /clean grey-white wall and floor/);
assert.match(section(sk04Prompt, "06 SCENE"), /simple light neutral backdrop/);
assert.match(section(sk04Prompt, "06 SCENE"), /one chair as the spatial anchor/);
assert.match(section(sk04Prompt, "06 SCENE"), /Tiny styling details are acceptable only if they do not read as additional furniture/);
assert.match(section(sk04Prompt, "06 SCENE"), /Avoid cement-wall or concrete-room feeling/);
assert.match(section(sk04Prompt, "06 SCENE"), /shelves, cabinets, side tables/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /soft diffused daylight/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /gentle grounded shadows/);
assert.match(section(sk04Prompt, "09 COLOR"), /grey-white studio wall\/floor palette/);
assert.match(section(sk04Prompt, "09 COLOR"), /no cement\/concrete-room dominance/);
assert.match(section(sk04Prompt, "09 COLOR"), /no warm yellow room tone/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not remove the meaningful hero prop\/object relationship/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not use cement-wall or concrete-room atmosphere/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not add shelves, cabinets, side tables/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /decorative architecture/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /never distort uploaded products just to fit the furniture/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /warm yellow room tone, orange cast/);
assert.doesNotMatch(section(sk04Prompt, "06 SCENE"), /light grey concrete studio interior/);
assert.doesNotMatch(section(sk04Prompt, "06 SCENE"), /minimal industrial environment/);
assert.doesNotMatch(section(sk04Prompt, "12 MOOD"), /industrial/i);

const nonSk01Prompts = [
  sk02Prompt,
  plan({ selectedSkillId: "SK03_LOOK_BREAKDOWN", scene: "S01", composition: "C05", graphic: "G01", look: "L02" }).finalPrompt,
  sk04Prompt,
  plan({ selectedSkillId: "SK05_JAPANESE_CATALOG", scene: "S05", composition: "C02", graphic: "G04", look: "L05" }).finalPrompt,
  plan({ selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL", scene: "S02", composition: "C04", graphic: "G02", look: "L01" }).finalPrompt
];
for (const prompt of nonSk01Prompts) {
  assert.doesNotMatch(prompt, /approved 01 visual reference/);
  assert.doesNotMatch(prompt, /slightly cooler clean neutral-grey cement or concrete indoor floor/);
  assert.doesNotMatch(prompt, /pure white cutout-on-background collage/);
  assert.doesNotMatch(prompt, /true overhead \/ top-down photography/);
  assert.doesNotMatch(prompt, /warm beige floor appearance/);
  assert.doesNotMatch(prompt, /brownish-grey or muddy grey cast/);
}

const unchangedSkillPrompts = [
  plan({ selectedSkillId: "SK03_LOOK_BREAKDOWN", scene: "S01", composition: "C05", graphic: "G01", look: "L02" }).finalPrompt,
  plan({ selectedSkillId: "SK05_JAPANESE_CATALOG", scene: "S05", composition: "C02", graphic: "G04", look: "L05" }).finalPrompt,
  plan({ selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL", scene: "S02", composition: "C04", graphic: "G02", look: "L01" }).finalPrompt
];
for (const prompt of unchangedSkillPrompts) {
  assert.doesNotMatch(prompt, /approved 02 visual reference/);
  assert.doesNotMatch(prompt, /approved 04 visual reference/);
  assert.doesNotMatch(prompt, /very low environmental complexity/);
  assert.doesNotMatch(prompt, /relaxed editorial floor-lay setting/);
  assert.doesNotMatch(prompt, /body-illusion staging, mannequin-like body structure/);
  assert.doesNotMatch(prompt, /one visually dominant hero chair/);
  assert.doesNotMatch(prompt, /soft diffuse studio daylight/);
  assert.doesNotMatch(prompt, /grey-white indoor studio wall\/floor/);
  assert.doesNotMatch(prompt, /warm yellow lighting, creamy beige dominance/);
}
const sk06Prompt = plan({
  selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL",
  scene: "S02",
  composition: "C04",
  graphic: "G02",
  look: "L01"
}).finalPrompt;
assert.match(section(sk06Prompt, "04 COMPOSITION"), /flat 2D human-silhouette outfit editorial/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Preserve one coherent head-to-toe outfit relationship/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as SK02's relaxed floor-lay still life/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as a product breakdown/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /believable full-outfit human proportions/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /complete outfit as the primary composition unit/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /small index number/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /short 1-3 word English product label/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /thin hand-drawn-style leader line/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /surrounding negative space/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /scattered independent items/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create a strong 3D invisible walking-body presentation/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not scatter garments into independent product tiles, a full product breakdown, or a generic catalog grid/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not maximize each product independently or distort product scale/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not use long generated marketing copy/);
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

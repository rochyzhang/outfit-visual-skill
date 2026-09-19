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
assert.match(plan({ graphic: "G04" }).finalPrompt, /Japanese magazine\/catalog typography with English as the primary product-information language/);
assert.match(plan({ graphic: "G04" }).finalPrompt, /limited short Japanese editorial accent text/);
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
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /lightweight product information annotations/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /thin arrows or leader lines plus short English labels in Title Case/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /Knit Polo \/ Soft Textured Knit/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /lively, and lifestyle still-life explanatory/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /realistic flat-lay photography rather than an information poster/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /point each arrow to the correct product/);
assert.match(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /Do not use all-caps for every product name/);
assert.doesNotMatch(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /restrained top title/);
assert.doesNotMatch(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /systematic product information labels/);
assert.doesNotMatch(section(sk01Prompt, "13 GRAPHIC OVERLAY"), /hero chair/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /pure white cutout-on-background collage/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /sterile ecommerce white canvas/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /realistic indoor cement\/concrete floor feeling/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /warm beige floor appearance, brownish-grey or muddy grey cast/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /dirty warm cement tone/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /overly contrasty floor texture/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not turn SK01 annotations into a poster title/);
assert.match(section(sk01Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /prefer Title Case labels/);
const sk02Composition = section(
  plan({ selectedSkillId: "SK02_INVISIBLE_EDITORIAL", composition: "C02", scene: "S01", look: "L02" }).finalPrompt,
  "04 COMPOSITION"
);
const sk02Prompt = plan({ selectedSkillId: "SK02_INVISIBLE_EDITORIAL", composition: "C02", scene: "S01", look: "L02" }).finalPrompt;
assert.match(sk02Composition, /clean editorial flat-lay outfit presentation/);
assert.match(sk02Composition, /tidier, more orderly, more controlled arrangement than SK01/);
assert.match(sk02Composition, /light neutral studio surface/);
assert.match(sk02Composition, /clear product separation, deliberate spacing/);
assert.match(sk02Composition, /each major item reads clearly as its own product/);
assert.match(sk02Composition, /deliberate spacing, neat alignment/);
assert.match(sk02Composition, /polished editorial negative space/);
assert.match(sk02Composition, /top or outer as the upper visual anchor/);
assert.match(sk02Composition, /trousers as the dominant lower-body item/);
assert.match(sk02Composition, /shoes grouped naturally near the lower area/);
assert.match(sk02Composition, /minimal and deliberate overlap only when it improves hierarchy/);
assert.match(sk02Composition, /shallow, flat, curated, and editorial/);
assert.match(sk02Composition, /human-absent and clothing-only/);
assert.match(sk02Composition, /no invisible-body structure/);
assert.doesNotMatch(sk02Composition, /invisible person in motion/);
assert.doesNotMatch(sk02Composition, /dynamic garment articulation/);
assert.doesNotMatch(sk02Composition, /reclining body arrangement/);
assert.doesNotMatch(sk02Composition, /flat 2D human-silhouette outfit editorial/);
assert.doesNotMatch(sk02Composition, /casual but intentional placement/);
assert.doesNotMatch(sk02Composition, /mild overlap, rhythm, visual hierarchy/);
assert.match(section(sk02Prompt, "06 SCENE"), /clean editorial flat-lay studio setting/);
assert.match(section(sk02Prompt, "06 SCENE"), /with its own 02 visual reference only/);
assert.match(section(sk02Prompt, "06 SCENE"), /clean white, soft grey, or very pale neutral studio/);
assert.match(section(sk02Prompt, "06 SCENE"), /Keep SK02 cleaner, tidier, more controlled, and more product-separated than SK01/);
assert.match(section(sk02Prompt, "06 SCENE"), /Avoid borrowing SK01's casual concrete-floor arrangement language/);
assert.match(section(sk02Prompt, "06 SCENE"), /cement-floor realism, strong concrete texture, warm beige cast/);
assert.match(section(sk02Prompt, "06 SCENE"), /body-illusion staging, mannequin-like body structure/);
assert.match(section(sk02Prompt, "06 SCENE"), /prop styling, catalog graphics, Korean callouts/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /3D invisible-human impression/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /reclining or sprawled invisible-body arrangement/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /one visually dominant hero prop/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /early approved 01 flat-lay result/);
assert.doesNotMatch(section(sk02Prompt, "06 SCENE"), /slightly cooler clean neutral-grey cement or concrete indoor floor/);
assert.match(section(sk02Prompt, "08 LIGHTING"), /soft clean studio daylight/);
assert.match(section(sk02Prompt, "08 LIGHTING"), /polished editorial still-life mood/);
assert.match(section(sk02Prompt, "09 COLOR"), /clean pale neutral studio palette/);
assert.match(section(sk02Prompt, "09 COLOR"), /white to soft grey surface/);
assert.match(section(sk02Prompt, "09 COLOR"), /not beige, not concrete-grey/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /clean editorial outfit information layout/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /restrained top title such as OUTFIT NOTES, EDITED LOOK, or MONTHLY OUTFIT/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /systematic product information labels/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /category or neutral product name as the primary line/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /optional short description as the secondary line/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /simple thin leader lines/);
assert.match(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /do not copy reference-image brand names, website addresses, logos, months, or slogans/);
assert.doesNotMatch(section(sk02Prompt, "13 GRAPHIC OVERLAY"), /lifestyle still-life explanatory/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /No visible human body, face, skin, person, or mannequin/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create an invisible-body structure, body-shaped outfit arrangement/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not flatten SK02 into SK06's flat 2D human-silhouette presentation/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not turn SK02 into SK04 prop styling, SK05 catalog graphics, SK06 Korean callout editorial/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /casually layered, naturally messy, loosely scattered/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /clean, tidy, separated, controlled, and editorial/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not add furniture, chair props/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /cement-floor realism, strong concrete texture/);
assert.match(section(sk02Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not copy brand names, website URLs, logos, months, or slogans/);
assert.doesNotMatch(sk02Prompt, /prefer an invisible outfit lying/);
assert.doesNotMatch(sk02Prompt, /coherent reclining body arrangement/);
assert.doesNotMatch(sk02Prompt, /floor contact, and body weight/);
assert.doesNotMatch(sk02Prompt, /relaxed editorial floor-lay/);

const sk04Prompt = plan({ selectedSkillId: "SK04_PROP_STYLING", composition: "C03", scene: "S01", look: "L02" }).finalPrompt;
assert.match(section(sk04Prompt, "04 COMPOSITION"), /one visually dominant hero chair/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Interpret the SK04 reference as a chair-supported product display system/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /styling prop, display support, flat structural support, and garment support/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /not a hidden torso, pelvis, hips, thighs, knees, calves, legs, seated body, standing body, or mannequin/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /garments arranged on a chair as a fashion display/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /garments arranged on a chair as a fashion display, not as an invisible person sitting in the clothes/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Human-referential reading is allowed only through garment order and outfit relationship, not body shape, human pose, or body posture/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Garments must remain empty, unworn, non-inflated, and product-like/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the chair, contact with the floor, or contact with other products; never from hidden human anatomy/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Tops or inner tops may rest over the chair back, wrap lightly around chair edges, hang naturally from chair contact, or be supported by the chair while staying visibly empty/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /no chest volume, torso cavity, stretched shoulder anatomy, hidden torso, or worn-body tension/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /If an outer garment exists, layer it naturally over or around the top/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /drape it over the chair back or side/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /without invisible shoulder\/body volume or mannequin-like jacket structure/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Trousers must be laid or draped from the chair seat or seat edge/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /waistband may rest on the chair seat or edge/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /legs may drape downward naturally, collapse, flatten, twist, fold, or pool/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /folds created by fabric weight, denim stiffness, garment cut, gravity, chair contact, and natural bunching/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Natural garment volume is allowed; human anatomical volume is not/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /must not form two clean anatomical leg tubes, inflated trouser legs, hidden thigh shapes, hidden knee shapes, calf volume, pelvis or hip anatomy, sitting-leg anatomy, or a seated-body pose/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Bags may hang from or rest against the chair as an independent product/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /not as if carried by an invisible shoulder or arm/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /Shoes should stay product-like near the chair or lower composition area/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /not aligned as invisible feet or forced into SK06 standing-pose logic/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /prop should organize the outfit spatially/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /seated invisible-person structure, standing silhouette/);
assert.match(section(sk04Prompt, "04 COMPOSITION"), /body-inflated garment tension/);
assert.doesNotMatch(section(sk04Prompt, "04 COMPOSITION"), /form a seated human silhouette/);
assert.doesNotMatch(section(sk04Prompt, "04 COMPOSITION"), /human-shaped/);
assert.doesNotMatch(section(sk04Prompt, "04 COMPOSITION"), /loosely suggests torso and lower-body regions/);
assert.match(section(sk04Prompt, "06 SCENE"), /approved clean premium cool grey-white studio wall\/floor/);
assert.match(section(sk04Prompt, "06 SCENE"), /clean grey-white wall and floor/);
assert.match(section(sk04Prompt, "06 SCENE"), /seamless quiet wall\/floor relationship/);
assert.match(section(sk04Prompt, "06 SCENE"), /simple light neutral backdrop/);
assert.match(section(sk04Prompt, "06 SCENE"), /one chair as the spatial anchor/);
assert.match(section(sk04Prompt, "06 SCENE"), /soft even ambient studio light/);
assert.match(section(sk04Prompt, "06 SCENE"), /very low directional-light drama/);
assert.match(section(sk04Prompt, "06 SCENE"), /minimal shadow pattern/);
assert.match(section(sk04Prompt, "06 SCENE"), /Tiny styling details are acceptable only if they do not read as additional furniture/);
assert.match(section(sk04Prompt, "06 SCENE"), /Avoid rough cement room feeling/);
assert.match(section(sk04Prompt, "06 SCENE"), /industrial concrete-wall dominance/);
assert.match(section(sk04Prompt, "06 SCENE"), /visible sunbeam, window-light streak, diagonal light patch/);
assert.match(section(sk04Prompt, "06 SCENE"), /dramatic floor shadow, warm sunlight/);
assert.match(section(sk04Prompt, "06 SCENE"), /shelves, cabinets, side tables/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /soft even ambient studio light/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /diffuse lighting/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /no visible sunbeam/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /no window-light streak/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /no diagonal light patch/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /no dramatic floor shadow/);
assert.match(section(sk04Prompt, "08 LIGHTING"), /no warm sunlight/);
assert.match(section(sk04Prompt, "09 COLOR"), /cool grey-white studio wall\/floor palette/);
assert.match(section(sk04Prompt, "09 COLOR"), /clean slightly cool-neutral interior tone/);
assert.match(section(sk04Prompt, "09 COLOR"), /no cement\/concrete-room dominance/);
assert.match(section(sk04Prompt, "09 COLOR"), /no warm yellow room tone/);
assert.match(section(sk04Prompt, "09 COLOR"), /no warm beige/);
assert.match(section(sk04Prompt, "13 GRAPHIC OVERLAY"), /one small top information row/);
assert.match(section(sk04Prompt, "13 GRAPHIC OVERLAY"), /concise English product notes/);
assert.match(section(sk04Prompt, "13 GRAPHIC OVERLAY"), /must not overpower the prop-styling image/);
assert.match(section(sk04Prompt, "13 GRAPHIC OVERLAY"), /must not cover the outfit or hero prop/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not remove the meaningful hero prop\/object relationship/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not use cement-wall or concrete-room atmosphere/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not use visible sunbeams, window-light streaks, diagonal light patches/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /SK04 lighting should be soft even ambient studio light/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not add shelves, cabinets, side tables/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /decorative architecture/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /never distort uploaded products just to fit the furniture/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /warm yellow room tone, orange cast/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not show a real human, face, skin, full mannequin, hidden mannequin, strong 3D invisible-person body, invisible seated person/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /human-referential only through garment order and chair-supported display logic, not body shape/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not make the chair behave like a hidden torso, pelvis, thighs, legs, seated body, standing body, or mannequin/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not make tops look worn by an invisible seated person/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /no chest volume caused by hidden torso, torso cavity, stretched shoulder anatomy, hidden body support, or worn-body tension/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not inflate trousers with invisible pelvis, hip, thigh, knee, or calf anatomy/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /no rounded leg tubes, inflated trouser legs, sitting-leg anatomy, seated-body pose encoded into trousers, two clean anatomical leg tubes/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Natural garment volume and 3D fabric folds from gravity, denim stiffness, garment cut, chair contact, and bunching are allowed; human anatomical volume is not/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not make bags look carried by an invisible person/);
assert.match(section(sk04Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /do not position shoes as invisible feet or force SK06 standing-pose shoe logic into SK04/);
assert.doesNotMatch(section(sk04Prompt, "04 COMPOSITION"), /standing human-pose silhouette/);
assert.doesNotMatch(section(sk04Prompt, "04 COMPOSITION"), /wearing-order arrangement logic/);
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
  plan({ selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL", scene: "S02", composition: "C04", graphic: "G02", look: "L01" }).finalPrompt
];
for (const prompt of unchangedSkillPrompts) {
  assert.doesNotMatch(prompt, /approved 02 visual reference/);
  assert.doesNotMatch(prompt, /approved 04 visual reference/);
  assert.doesNotMatch(prompt, /very low environmental complexity/);
  assert.doesNotMatch(prompt, /relaxed editorial floor-lay setting/);
  assert.doesNotMatch(prompt, /clean editorial flat-lay studio setting/);
  assert.doesNotMatch(prompt, /body-illusion staging, mannequin-like body structure/);
  assert.doesNotMatch(prompt, /one visually dominant hero chair/);
  assert.doesNotMatch(prompt, /soft diffuse studio daylight/);
  assert.doesNotMatch(prompt, /grey-white indoor studio wall\/floor/);
  assert.doesNotMatch(prompt, /warm yellow lighting, creamy beige dominance/);
  assert.doesNotMatch(prompt, /lightweight product information annotations/);
  assert.doesNotMatch(prompt, /clean editorial outfit information layout/);
  assert.doesNotMatch(prompt, /one small top information row/);
  assert.doesNotMatch(prompt, /subtle human-presence display/);
}
const sk05Prompt = plan({ selectedSkillId: "SK05_JAPANESE_CATALOG", scene: "S05", composition: "C02", graphic: "G04", look: "L05" }).finalPrompt;
assert.match(section(sk05Prompt, "04 COMPOSITION"), /Japanese lifestyle magazine\/catalog page language/);
assert.match(section(sk05Prompt, "04 COMPOSITION"), /main outfit composition dominant/);
assert.match(section(sk05Prompt, "04 COMPOSITION"), /English should carry the primary product information/);
assert.match(section(sk05Prompt, "04 COMPOSITION"), /small restrained Japanese editorial accent text allowed/);
assert.match(section(sk05Prompt, "04 COMPOSITION"), /Do not create a vertical column of multiple product zoom\/detail boxes/);
assert.match(section(sk05Prompt, "06 SCENE"), /warm off-white, soft paper-like Japanese magazine\/catalog page environment/);
assert.match(section(sk05Prompt, "06 SCENE"), /Avoid technical product-detail boards/);
assert.match(section(sk05Prompt, "13 GRAPHIC OVERLAY"), /Japanese lifestyle magazine\/catalog page layout/);
assert.match(section(sk05Prompt, "13 GRAPHIC OVERLAY"), /English should be the primary informational language/);
assert.match(section(sk05Prompt, "13 GRAPHIC OVERLAY"), /small amount of short Japanese editorial accent text is allowed/);
assert.match(section(sk05Prompt, "13 GRAPHIC OVERLAY"), /Do not create large blocks of Japanese/);
assert.match(section(sk05Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not add a vertical column of multiple product zoom\/detail boxes/);
assert.match(section(sk05Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /technical product-detail pages/);
assert.doesNotMatch(section(sk05Prompt, "13 GRAPHIC OVERLAY"), /English-only visible typography/);
const sk06Prompt = plan({
  selectedSkillId: "SK06_KOREAN_STREET_EDITORIAL",
  scene: "S02",
  composition: "C04",
  graphic: "G02",
  look: "L01"
}).finalPrompt;
assert.match(section(sk06Prompt, "04 COMPOSITION"), /flat outfit arranged in normal wearing order/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Follow strict wearing-order arrangement logic/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as SK04 chair-supported display/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /top or outer sits at the upper-body position/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /bottom is placed directly below it with a believable waist-to-hem relationship/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /shoes sit at the bottom as the end of the outfit/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /both shoe toes point in one coordinated pose direction/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /visually continue the trouser-leg directions/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /bag sits as an accessory relative to the upper-body or shoulder area/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Preserve one coherent flat laid-out Look relationship/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as SK02's clean separated studio flat lay/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /not as a product breakdown/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /may suggest a standing person through order and placement only, but it must not simulate a standing body/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Pose feeling may come from slight angle between top and trousers, subtle asymmetry, offset product placement, coordinated leg directions, bag position, and shoe direction/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Pose feeling must not come from body volume/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /remain laid out, staged, flat, empty, unworn, non-inflated, and product-like/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the floor, or contact with other products; never from hidden human anatomy/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /must not look like a standing invisible model/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Trousers must stay flat and empty with no hidden hips, pelvis, thigh anatomy, knee anatomy, calf anatomy, inflated leg tubes, or anatomy-shaped leg volume/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /Shoes are staged products, not worn feet/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /complete outfit as the primary composition unit/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /more pose energy than a simple straight flat lay without becoming worn-body styling/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /small index number/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /short 1-3 word English product label/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /white hand-drawn-style leader line/);
assert.match(section(sk06Prompt, "04 COMPOSITION"), /surrounding negative space/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /scattered independent items/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /readable torso/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /shoulder-to-hip relationship/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /visible torso axis/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /controlled hip shift/);
assert.doesNotMatch(section(sk06Prompt, "04 COMPOSITION"), /standing human-pose silhouette/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create a standing invisible-person, worn-body, or strong 3D invisible walking-body presentation/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not make garments look worn by invisible feet, legs, torso, shoulders, hips, pelvis, or body/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /chest volume caused by hidden torso/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /pelvis volume, hip anatomy, thigh anatomy, knee anatomy, calf anatomy/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /inflated trouser legs, clothing tension caused by a hidden body/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not scatter garments into independent product tiles, a full product breakdown, or a generic catalog grid/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not create random flat-lay scattering/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /without wearing-order logic/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not break the top-to-trouser-to-shoe hierarchy/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /top must sit above the trousers, trousers directly below, and shoes at the bottom as coordinated staged products/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not place the bag as a random isolated product/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /near the upper-body or shoulder side/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /Do not reduce SK06 to a rigid straight-line flat lay or simple product flat lay/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /wearing-order hierarchy, coordinated trouser direction, coordinated shoe direction, and subtle asymmetry without body volume/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /shoe toes should point in the same general direction/);
assert.match(section(sk06Prompt, "15 NEGATIVE / PROHIBITED BEHAVIOR"), /shoes should visually continue the trouser-leg directions while remaining staged products, not invisible feet/);
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

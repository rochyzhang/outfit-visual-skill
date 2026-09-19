import assert from "node:assert/strict";
import { aspectRatioOptions, modeOptions, qualityOptions } from "@/config/output-options";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { lookPresets } from "@/config/presets/looks";
import { scenePresets } from "@/config/presets/scenes";
import {
  getWorkflowSkill,
  isWorkflowSkillId,
  listWorkflowSkillManifests,
  listWorkflowSkills,
  v1WorkflowSkillSupportedOverrides,
  workflowSkillIds
} from "@/config/skills";
import type { OutfitSlotKey } from "@/types/domain";

const expectedSkillIds = [
  "SK01_MINIMAL_FLAT_LAY",
  "SK02_INVISIBLE_EDITORIAL",
  "SK03_LOOK_BREAKDOWN",
  "SK04_PROP_STYLING",
  "SK05_JAPANESE_CATALOG",
  "SK06_KOREAN_STREET_EDITORIAL"
] as const;

const originalSceneIds = ["S01", "S02", "S03", "S04", "S05", "S06"];
const originalCompositionIds = ["C01", "C02", "C03", "C04", "C05"];
const originalGraphicIds = ["None", "G01", "G02", "G03", "G04"];
const originalLookIds = ["L01", "L02", "L03", "L04", "L05", "L06"];

const skills = listWorkflowSkills();
const manifests = listWorkflowSkillManifests();
const slotKeys = new Set(outfitSlotDefinitions.map((slot) => slot.key));
const sceneIds = new Set(scenePresets.map((preset) => preset.id));
const compositionIds = new Set(compositionPresets.map((preset) => preset.id));
const graphicIds = new Set(graphicPresets.map((preset) => preset.id));
const lookIds = new Set(lookPresets.map((preset) => preset.id));
const aspectRatios = new Set(aspectRatioOptions.map((option) => option.value));
const qualities = new Set(qualityOptions.map((option) => option.value));
const modes = new Set(modeOptions.map((option) => option.value));

function requiredRule(skillId: (typeof expectedSkillIds)[number]) {
  return getWorkflowSkill(skillId).requiredInputRule;
}

function assertStandardSingleOutfitRule(skillId: "SK01_MINIMAL_FLAT_LAY" | "SK02_INVISIBLE_EDITORIAL") {
  assert.deepEqual(requiredRule(skillId), {
    allOf: ["bottom", "shoes"],
    anyOf: [["top", "outer"]]
  });
}

function flatRequiredSlots(skill: (typeof skills)[number]): OutfitSlotKey[] {
  return [...(skill.requiredInputRule.allOf ?? []), ...(skill.requiredInputRule.anyOf ?? []).flat()];
}

assert.equal(skills.length, 6);
assert.deepEqual(workflowSkillIds, expectedSkillIds);
assert.deepEqual(
  skills.map((skill) => skill.id),
  expectedSkillIds
);
assert.equal(new Set(skills.map((skill) => skill.id)).size, 6);
assert.ok(isWorkflowSkillId("SK01_MINIMAL_FLAT_LAY"));
assert.ok(!isWorkflowSkillId("SK00_COUPLE_LOOK"));

for (const skill of skills) {
  assert.ok(sceneIds.has(skill.defaults.scenePresetId), `${skill.id} scene preset must resolve`);
  assert.ok(compositionIds.has(skill.defaults.compositionPresetId), `${skill.id} composition preset must resolve`);
  assert.ok(graphicIds.has(skill.defaults.graphicPresetId), `${skill.id} graphic preset must resolve`);
  assert.ok(lookIds.has(skill.defaults.lookPresetId), `${skill.id} look preset must resolve`);
  assert.ok(aspectRatios.has(skill.defaults.aspectRatio), `${skill.id} aspect ratio must resolve`);
  assert.ok(qualities.has(skill.defaults.quality), `${skill.id} quality must resolve`);
  assert.ok(modes.has(skill.defaults.mode), `${skill.id} mode must resolve`);
  assert.equal(skill.defaults.productFidelity, true, `${skill.id} must default Product Fidelity on`);
  assert.deepEqual(skill.supportedOverrides, v1WorkflowSkillSupportedOverrides);

  for (const slot of [...flatRequiredSlots(skill), ...skill.recommendedSlots]) {
    assert.ok(slotKeys.has(slot), `${skill.id} uses existing slot ${slot}`);
  }

  for (const slot of skill.recommendedSlots) {
    assert.ok(!flatRequiredSlots(skill).includes(slot), `${skill.id} recommended slot ${slot} must not be required`);
  }
}

assertStandardSingleOutfitRule("SK01_MINIMAL_FLAT_LAY");
assertStandardSingleOutfitRule("SK02_INVISIBLE_EDITORIAL");
assert.deepEqual(requiredRule("SK03_LOOK_BREAKDOWN"), { minValidProductReferences: 3 });

const sk02 = getWorkflowSkill("SK02_INVISIBLE_EDITORIAL");
assert.equal(sk02.name, "Clean Editorial Flat Lay");
assert.equal(sk02.defaults.scenePresetId, "S01");
assert.equal(sk02.defaults.compositionPresetId, "C02");
assert.equal(sk02.defaults.lookPresetId, "L02");
assert.match(sk02.description, /Clean human-absent editorial flat lay/);

const sk04 = getWorkflowSkill("SK04_PROP_STYLING");
assert.equal(sk04.defaults.scenePresetId, "S01");
assert.equal(sk04.defaults.lookPresetId, "L02");
assert.ok(!flatRequiredSlots(sk04).includes("prop01"));
assert.ok(!flatRequiredSlots(sk04).includes("prop02"));
assert.ok(sk04.recommendedSlots.includes("prop01"));
assert.ok(sk04.recommendedSlots.includes("prop02"));
assert.ok(sk04.recommendedSlots.includes("shoes"));

const sk05 = getWorkflowSkill("SK05_JAPANESE_CATALOG");
assert.equal(sk05.defaults.graphicPresetId, "G04");
assert.equal(sk05.safeguards.englishVisibleTextOnly, false);
assert.match(sk05.description, /Japanese magazine\/catalog-inspired/);
assert.match(sk05.description, /limited Japanese editorial accent text/);

const sk06 = getWorkflowSkill("SK06_KOREAN_STREET_EDITORIAL");
assert.equal(sk06.defaults.graphicPresetId, "G02");
assert.equal(sk06.defaults.lookPresetId, "L01");
assert.equal(sk06.safeguards.englishVisibleTextOnly, true);
assert.match(sk06.description, /Korean streetwear \/ Seoul editorial-inspired/);
assert.match(sk06.description, /wearing-order human-pose placement/);

for (const skill of skills) {
  assert.ok(!skill.id.includes("COUPLE"));
  assert.deepEqual(skill.supportedContentTypes, ["men", "genderless"]);
  assert.ok(!(skill.supportedContentTypes as readonly string[]).includes("couple"));
  assert.ok(!(skill.supportedContentTypes as readonly string[]).includes("any_single"));
  assert.ok(skill.safeguards.preserveUploadedProducts);
}

for (const skill of skills.filter((skill) => skill.recommendedSlots.includes("socks"))) {
  assert.ok(!flatRequiredSlots(skill).includes("socks"), `${skill.id} must keep socks optional`);
}

const optionalAccessorySlots = ["accessory01", "accessory02", "glasses", "prop01", "prop02"] satisfies OutfitSlotKey[];
for (const skill of skills) {
  for (const slot of optionalAccessorySlots) {
    assert.ok(!flatRequiredSlots(skill).includes(slot), `${skill.id} must keep ${slot} optional`);
  }
}

assert.deepEqual(v1WorkflowSkillSupportedOverrides, [
  "scenePresetId",
  "compositionPresetId",
  "graphicPresetId",
  "lookPresetId",
  "aspectRatio",
  "quality",
  "providerId",
  "notes"
]);
assert.ok(!(v1WorkflowSkillSupportedOverrides as readonly string[]).includes("productFidelity"));

assert.equal(manifests.length, 6);
assert.doesNotThrow(() => JSON.stringify(manifests));
assert.ok(!JSON.stringify(manifests).includes("requiredInputRule"));
assert.deepEqual(manifests.map((manifest) => manifest.requiredInputs), skills.map((skill) => skill.requiredInputRule));

assert.deepEqual(scenePresets.map((preset) => preset.id), originalSceneIds);
assert.deepEqual(compositionPresets.map((preset) => preset.id), originalCompositionIds);
assert.deepEqual(graphicPresets.map((preset) => preset.id), originalGraphicIds);
assert.deepEqual(lookPresets.map((preset) => preset.id), originalLookIds);

console.log("Skill registry tests passed.");






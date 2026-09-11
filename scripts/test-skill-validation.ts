import assert from "node:assert/strict";
import { getWorkflowSkill } from "@/config/skills";
import { validateSelectedSkillInput, validateSkillInput } from "@/features/skill/skill-validation";
import type { Asset, OutfitSlotKey, WorkflowDraft } from "@/types/domain";

function asset(id: string): Asset {
  return {
    id,
    type: "product",
    fileName: `${id}.png`,
    originalFileName: `${id}.png`,
    relativePath: `uploads/${id}.png`,
    publicUrl: `/uploads/${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 1000,
    height: 1200,
    createdAt: new Date(0).toISOString()
  };
}

function workflow(slots: OutfitSlotKey[] = [], selectedSkillId: WorkflowDraft["selectedSkillId"] = "SK01_MINIMAL_FLAT_LAY"): WorkflowDraft {
  const outfitSlots: WorkflowDraft["outfitSlots"] = {
    hat: null,
    glasses: null,
    neck: null,
    inner: null,
    top: null,
    outer: null,
    bottom: null,
    socks: null,
    shoes: null,
    bag: null,
    accessory01: null,
    accessory02: null,
    prop01: null,
    prop02: null
  };

  slots.forEach((slot) => {
    outfitSlots[slot] = asset(slot);
  });

  return {
    selectedSkillId,
    contentType: "men",
    productFidelity: true,
    outfitSlots,
    scene: {
      preset: "S01",
      reference: null,
      customPrompt: ""
    },
    composition: {
      preset: "C02",
      graphic: "None"
    },
    look: "L02",
    output: {
      providerId: "openai",
      aspectRatio: "3:4",
      count: 1,
      quality: "standard",
      mode: "single"
    }
  };
}

{
  assert.equal(validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["top", "bottom", "shoes"])).status, "pass");
  assert.equal(validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["outer", "bottom", "shoes"])).status, "pass");
  assert.equal(validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["bottom", "shoes"])).status, "fail");
  assert.equal(validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["top", "shoes"])).status, "fail");
  assert.equal(validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["top", "bottom"])).status, "fail");

  const recommendedEmpty = validateSkillInput("SK01_MINIMAL_FLAT_LAY", workflow(["top", "bottom", "shoes"]));
  assert.equal(recommendedEmpty.status, "pass");
  assert.equal(recommendedEmpty.issues.length, 0);
}

{
  const skill = getWorkflowSkill("SK03_LOOK_BREAKDOWN");
  assert.equal(validateSkillInput(skill, workflow(["top", "bottom"], "SK03_LOOK_BREAKDOWN")).status, "fail");
  assert.equal(validateSkillInput(skill, workflow(["top", "bottom", "shoes"], "SK03_LOOK_BREAKDOWN")).status, "pass");

  const withScene = workflow(["top", "bottom"], "SK03_LOOK_BREAKDOWN");
  withScene.scene.reference = {
    ...asset("scene-reference"),
    type: "scene_reference"
  };
  assert.equal(validateSkillInput(skill, withScene).status, "fail");
}

{
  const propStyling = validateSkillInput("SK04_PROP_STYLING", workflow(["top", "bottom"], "SK04_PROP_STYLING"));
  assert.notEqual(propStyling.status, "fail");
  assert.ok(propStyling.issues.every((issue) => issue.severity !== "error"));
}

{
  const skipped = validateSelectedSkillInput(workflow(["top", "bottom", "shoes"], null));
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.issues.length, 0);
}

console.log("Skill validation tests passed.");

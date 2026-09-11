import assert from "node:assert/strict";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { createDefaultWorkflowState, useWorkflowStore, workflowStateToDraft } from "@/stores/workflow-store";
import {
  createDefaultWorkflowSnapshot,
  resolveWorkflowSnapshot,
  snapshotKey,
  validateWorkflowSnapshot,
  workflowDraftToSnapshot
} from "@/lib/workflow/workflow-snapshot";
import { getWorkflowSkill, listWorkflowSkills } from "@/config/skills";
import type { Asset, WorkflowDraft } from "@/types/domain";

function asset(id: string): Asset {
  return {
    id,
    type: "product",
    fileName: `${id}.png`,
    originalFileName: `${id}.png`,
    relativePath: `assets/${id}.png`,
    publicUrl: `/api/assets/${id}.png`,
    mimeType: "image/png",
    sizeBytes: 70,
    width: 1,
    height: 1,
    createdAt: "2026-09-10T00:00:00.000Z"
  };
}

function resetWorkflow(input: Partial<WorkflowDraft> = {}) {
  useWorkflowStore.setState({
    ...createDefaultWorkflowState(),
    ...input
  });
}

function populatedWorkflow() {
  const base = createDefaultWorkflowState();
  const outfitSlots = Object.fromEntries(Object.keys(base.outfitSlots).map((slot) => [slot, asset(`asset-${slot}`)])) as WorkflowDraft["outfitSlots"];

  return {
    ...base,
    outfitSlots,
    scene: {
      ...base.scene,
      reference: asset("scene-reference"),
      customPrompt: "existing custom scene text"
    }
  } satisfies WorkflowDraft;
}


function partiallyPopulatedWorkflow() {
  const base = createDefaultWorkflowState();

  return {
    ...base,
    outfitSlots: {
      ...base.outfitSlots,
      outer: asset("outer-real"),
      bottom: asset("bottom-real"),
      shoes: asset("shoes-real"),
      bag: asset("bag-real")
    },
    scene: {
      ...base.scene,
      reference: null
    }
  } satisfies WorkflowDraft;
}
function assertSkillDefaultsApplied(skillId: ReturnType<typeof listWorkflowSkills>[number]["id"]) {
  resetWorkflow({
    ...populatedWorkflow(),
    productFidelity: false
  });
  const before = useWorkflowStore.getState();
  const outfitBefore = before.outfitSlots;
  const sceneReferenceBefore = before.scene.reference;
  const customPromptBefore = before.scene.customPrompt;
  const skill = getWorkflowSkill(skillId);

  useWorkflowStore.getState().applySkill(skillId);

  const after = useWorkflowStore.getState();
  assert.equal(after.selectedSkillId, skillId);
  assert.equal(after.productFidelity, true);
  assert.equal(after.scene.preset, skill.defaults.scenePresetId);
  assert.equal(after.composition.preset, skill.defaults.compositionPresetId);
  assert.equal(after.composition.graphic, skill.defaults.graphicPresetId);
  assert.equal(after.look, skill.defaults.lookPresetId);
  assert.equal(after.output.aspectRatio, skill.defaults.aspectRatio);
  assert.equal(after.output.quality, skill.defaults.quality);
  assert.equal(after.output.mode, skill.defaults.mode);
  assert.equal(after.output.providerId, before.output.providerId);
  assert.equal(after.output.count, before.output.count);
  assert.deepEqual(after.outfitSlots, outfitBefore);
  assert.equal(after.scene.reference, sceneReferenceBefore);
  assert.equal(after.scene.customPrompt, customPromptBefore);
}

for (const skill of listWorkflowSkills()) {
  assertSkillDefaultsApplied(skill.id);
}
for (const skill of listWorkflowSkills()) {
  resetWorkflow(partiallyPopulatedWorkflow());
  useWorkflowStore.getState().applySkill(skill.id);

  const after = useWorkflowStore.getState();
  assert.equal(after.outfitSlots.outer?.id, "outer-real");
  assert.equal(after.outfitSlots.bottom?.id, "bottom-real");
  assert.equal(after.outfitSlots.shoes?.id, "shoes-real");
  assert.equal(after.outfitSlots.bag?.id, "bag-real");
  assert.equal(after.outfitSlots.hat, null);
  assert.equal(after.outfitSlots.glasses, null);
  assert.equal(after.outfitSlots.neck, null);
  assert.equal(after.outfitSlots.inner, null);
  assert.equal(after.outfitSlots.top, null);
  assert.equal(after.outfitSlots.socks, null);
  assert.equal(after.outfitSlots.accessory01, null);
  assert.equal(after.outfitSlots.accessory02, null);
  assert.equal(after.outfitSlots.prop01, null);
  assert.equal(after.outfitSlots.prop02, null);
  assert.equal(after.scene.reference, null);

  const productReferences = buildGenerationConfig(after.getWorkflowDraft()).products;
  assert.deepEqual(
    productReferences.map((reference) => reference.assetId),
    ["outer-real", "bottom-real", "shoes-real", "bag-real"]
  );
  assert.ok(productReferences.every((reference) => reference.assetId && !reference.assetId.includes("placeholder")));
}

resetWorkflow({
  ...createDefaultWorkflowState(),
  outfitSlots: {
    ...createDefaultWorkflowState().outfitSlots,
    top: asset("top-only-real")
  },
  scene: {
    ...createDefaultWorkflowState().scene,
    reference: null
  }
});
useWorkflowStore.getState().applySkill("SK01_MINIMAL_FLAT_LAY");
assert.equal(useWorkflowStore.getState().outfitSlots.bottom, null);
assert.equal(useWorkflowStore.getState().outfitSlots.shoes, null);
assert.equal(useWorkflowStore.getState().outfitSlots.prop01, null);
assert.equal(useWorkflowStore.getState().outfitSlots.prop02, null);
assert.equal(useWorkflowStore.getState().scene.reference, null);
assert.deepEqual(
  buildGenerationConfig(useWorkflowStore.getState().getWorkflowDraft()).products.map((reference) => reference.assetId),
  ["top-only-real"]
);

resetWorkflow({ ...populatedWorkflow(), contentType: "genderless" });
useWorkflowStore.getState().applySkill("SK02_INVISIBLE_EDITORIAL");
assert.equal(useWorkflowStore.getState().contentType, "genderless");

resetWorkflow({ ...populatedWorkflow(), contentType: "couple" });
useWorkflowStore.getState().applySkill("SK02_INVISIBLE_EDITORIAL");
assert.equal(useWorkflowStore.getState().contentType, "men");

resetWorkflow(populatedWorkflow());
const beforeSelectAssets = useWorkflowStore.getState().outfitSlots;
useWorkflowStore.getState().selectSkill("SK03_LOOK_BREAKDOWN");
assert.deepEqual(useWorkflowStore.getState().outfitSlots, beforeSelectAssets);

const beforeApplySnapshot = workflowDraftToSnapshot(workflowStateToDraft(createDefaultWorkflowState()));
resetWorkflow(populatedWorkflow());
useWorkflowStore.getState().applySkill("SK05_JAPANESE_CATALOG");
const appliedSnapshot = workflowDraftToSnapshot(useWorkflowStore.getState().getWorkflowDraft());
assert.notEqual(snapshotKey(appliedSnapshot), snapshotKey(beforeApplySnapshot));
assert.equal(appliedSnapshot.selectedSkillId, "SK05_JAPANESE_CATALOG");

const assetsById = new Map<string, Asset>();
for (const item of Object.values(useWorkflowStore.getState().outfitSlots)) {
  if (item) {
    assetsById.set(item.id, item);
  }
}
const sceneReference = useWorkflowStore.getState().scene.reference;
if (sceneReference) {
  assetsById.set(sceneReference.id, sceneReference);
}
const validation = validateWorkflowSnapshot(appliedSnapshot);
const resolved = resolveWorkflowSnapshot({ snapshot: validation.snapshot, assetsById });
assert.equal(resolved.workflow.selectedSkillId, "SK05_JAPANESE_CATALOG");

const oldSnapshot = { ...createDefaultWorkflowSnapshot() };
delete (oldSnapshot as Partial<typeof oldSnapshot>).selectedSkillId;
assert.equal(validateWorkflowSnapshot(oldSnapshot).snapshot.selectedSkillId, null);

useWorkflowStore.getState().setLookPreset("L03");
assert.equal(useWorkflowStore.getState().selectedSkillId, "SK05_JAPANESE_CATALOG");
assert.equal(useWorkflowStore.getState().look, "L03");

const generationConfig = buildGenerationConfig(useWorkflowStore.getState().getWorkflowDraft());
const generationPlan = compileGenerationPlan(generationConfig);
const promptQA = validateGenerationPlan(generationPlan, generationConfig);
assert.notEqual(promptQA.status, "fail");
assert.ok(generationPlan.finalPrompt.length > 0);

console.log("Skill apply tests passed.");






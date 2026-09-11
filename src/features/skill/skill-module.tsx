"use client";

import { useMemo, useState } from "react";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { aspectRatioOptions, modeOptions, qualityOptions } from "@/config/output-options";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { lookPresets } from "@/config/presets/looks";
import { scenePresets } from "@/config/presets/scenes";
import { getWorkflowSkill, listWorkflowSkills, type SkillInputRule, type WorkflowSkill } from "@/config/skills";
import { validateSelectedSkillInput, type SkillValidationCheckResult } from "@/features/skill/skill-validation";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { OutfitSlotKey } from "@/types/domain";

const slotLabels = new Map(outfitSlotDefinitions.map((slot) => [slot.key, slot.label]));
const sceneNames = new Map(scenePresets.map((preset) => [preset.id, preset.name]));
const compositionNames = new Map(compositionPresets.map((preset) => [preset.id, preset.name]));
const graphicNames = new Map(graphicPresets.map((preset) => [preset.id, preset.name]));
const lookNames = new Map(lookPresets.map((preset) => [preset.id, preset.name]));
const aspectRatioLabels = new Map(aspectRatioOptions.map((option) => [option.value, option.label]));
const qualityLabels = new Map(qualityOptions.map((option) => [option.value, option.label]));
const modeLabels = new Map(modeOptions.map((option) => [option.value, option.label]));

function slotLabel(slot: OutfitSlotKey) {
  return slotLabels.get(slot) ?? slot;
}

function formatInputRule(rule: SkillInputRule) {
  const requirements = [
    ...(rule.anyOf ?? []).map((group) => `At least one of ${group.map(slotLabel).join(" or ")}`),
    ...(rule.allOf ?? []).map(slotLabel),
    ...(rule.minValidProductReferences ? [`At least ${rule.minValidProductReferences} valid outfit/product references`] : [])
  ];

  return requirements;
}

function formatSlots(slots: OutfitSlotKey[]) {
  return slots.map(slotLabel).join(", ");
}

function formatDefaults(skill: WorkflowSkill) {
  return [
    sceneNames.get(skill.defaults.scenePresetId) ?? skill.defaults.scenePresetId,
    compositionNames.get(skill.defaults.compositionPresetId) ?? skill.defaults.compositionPresetId,
    graphicNames.get(skill.defaults.graphicPresetId) ?? skill.defaults.graphicPresetId,
    lookNames.get(skill.defaults.lookPresetId) ?? skill.defaults.lookPresetId,
    aspectRatioLabels.get(skill.defaults.aspectRatio) ?? skill.defaults.aspectRatio,
    qualityLabels.get(skill.defaults.quality) ?? skill.defaults.quality,
    modeLabels.get(skill.defaults.mode) ?? skill.defaults.mode
  ].join(" / ");
}

function skillMatchesCurrentWorkflow(skill: WorkflowSkill, state: ReturnType<typeof useWorkflowStore.getState>) {
  return (
    state.productFidelity === skill.defaults.productFidelity &&
    state.scene.preset === skill.defaults.scenePresetId &&
    state.composition.preset === skill.defaults.compositionPresetId &&
    state.composition.graphic === skill.defaults.graphicPresetId &&
    state.look === skill.defaults.lookPresetId &&
    state.output.aspectRatio === skill.defaults.aspectRatio &&
    state.output.quality === skill.defaults.quality &&
    state.output.mode === skill.defaults.mode
  );
}


function validationLabel(validation: SkillValidationCheckResult | null) {
  if (!validation || validation.status === "skipped") {
    return null;
  }

  if (validation.status === "fail") {
    return "Missing required inputs";
  }

  if (validation.status === "warning") {
    return "Warning";
  }

  return "Ready";
}

export function SkillModule() {
  const skills = useMemo(() => listWorkflowSkills(), []);
  const appliedSkillId = useWorkflowStore((state) => state.selectedSkillId);
  const contentType = useWorkflowStore((state) => state.contentType);
  const productFidelity = useWorkflowStore((state) => state.productFidelity);
  const outfitSlots = useWorkflowStore((state) => state.outfitSlots);
  const scene = useWorkflowStore((state) => state.scene);
  const composition = useWorkflowStore((state) => state.composition);
  const look = useWorkflowStore((state) => state.look);
  const output = useWorkflowStore((state) => state.output);
  const applySkill = useWorkflowStore((state) => state.applySkill);
  const [previewSkillId, setPreviewSkillId] = useState<WorkflowSkill["id"] | null>(null);
  const displayedSkillId = previewSkillId ?? appliedSkillId ?? skills[0]?.id ?? null;


  const selectedSkill = displayedSkillId ? getWorkflowSkill(displayedSkillId) : null;
  const appliedSkill = appliedSkillId ? getWorkflowSkill(appliedSkillId) : null;
  const currentWorkflow = {
    productFidelity,
    scene,
    composition,
    look,
    output
  } as ReturnType<typeof useWorkflowStore.getState>;
  const modified = appliedSkill ? !skillMatchesCurrentWorkflow(appliedSkill, currentWorkflow) : false;
  const skillValidation = appliedSkill
    ? validateSelectedSkillInput({
        selectedSkillId: appliedSkill.id,
        contentType,
        productFidelity,
        outfitSlots,
        scene,
        composition,
        look,
        output
      })
    : null;
  const skillValidationLabel = validationLabel(skillValidation);

  return (
    <WorkflowModule number="00" title="SKILL" description="Choose a workflow starting point." wide>
      <div className="skill-origin-row" data-testid="skill-origin">
        <span>{appliedSkill ? `Based on ${appliedSkill.name}` : "No Skill applied"}</span>
        {modified ? <strong>Modified</strong> : null}
      </div>

      {skillValidationLabel && skillValidation ? (
        <div className={`skill-validation-status skill-validation-status-${skillValidation.status}`} data-testid="skill-validation-status">
          <strong>{skillValidationLabel}</strong>
          {skillValidation.issues.length ? (
            <ul>
              {skillValidation.issues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="skill-list" aria-label="Workflow Skills">
        {skills.map((skill) => (
          <button
            key={skill.id}
            className={displayedSkillId === skill.id ? "skill-card selected" : "skill-card"}
            type="button"
            aria-pressed={displayedSkillId === skill.id}
            data-testid={`skill-card-${skill.id}`}
            onClick={() => setPreviewSkillId(skill.id)}
          >
            <span className="skill-card-title">{skill.name}</span>
            <span className="skill-card-description">{skill.description}</span>
          </button>
        ))}
      </div>

      {selectedSkill ? (
        <div className="skill-detail" data-testid="skill-detail">
          <div>
            <div className="section-label">Purpose</div>
            <p>{selectedSkill.description}</p>
          </div>
          <div>
            <div className="section-label">Required</div>
            <ul className="skill-chip-list" aria-label="Required inputs">
              {formatInputRule(selectedSkill.requiredInputRule).map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="section-label">Recommended</div>
            <p>{formatSlots(selectedSkill.recommendedSlots)}</p>
          </div>
          <div>
            <div className="section-label">Defaults</div>
            <p>{formatDefaults(selectedSkill)}</p>
          </div>
          {selectedSkill.safeguards.englishVisibleTextOnly ? (
            <p className="skill-safeguard">Visible graphic text: English only</p>
          ) : null}
          <button
            className="generate-button"
            type="button"
            data-testid="apply-skill-button"
            onClick={() => {
              applySkill(selectedSkill.id);
              setPreviewSkillId(selectedSkill.id);
            }}
          >
            Apply Skill
          </button>
        </div>
      ) : null}
    </WorkflowModule>
  );
}



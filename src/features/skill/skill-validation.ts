import { getWorkflowSkill, isWorkflowSkillId, type WorkflowSkill, type WorkflowSkillId } from "@/config/skills";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import type { OutfitSlotKey, WorkflowDraft } from "@/types/domain";

export const skillValidationCodes = {
  skillNotFound: "SKILL_NOT_FOUND",
  requiredSlotMissing: "SKILL_REQUIRED_SLOT_MISSING",
  minProductReferencesNotMet: "SKILL_MIN_PRODUCT_REFERENCES_NOT_MET",
  validationFailed: "SKILL_VALIDATION_FAILED",
  propContextMissing: "SKILL_PROP_CONTEXT_MISSING"
} as const;

export type SkillValidationStatus = "pass" | "warning" | "fail";
export type SkillValidationIssueSeverity = "warning" | "error";
export type SkillValidationIssueCode = (typeof skillValidationCodes)[keyof typeof skillValidationCodes];

export interface SkillValidationIssue {
  code: SkillValidationIssueCode;
  severity: SkillValidationIssueSeverity;
  message: string;
  slotIds?: OutfitSlotKey[];
}

export interface SkillValidationResult {
  skillId: WorkflowSkillId;
  status: SkillValidationStatus;
  issues: SkillValidationIssue[];
  metrics: {
    validProductReferenceCount: number;
    requiredSatisfied: boolean;
  };
}

export interface SkillValidationSkippedResult {
  skillId: null;
  status: "skipped";
  issues: [];
  metrics: {
    validProductReferenceCount: number;
    requiredSatisfied: true;
  };
}

export type SkillValidationCheckResult = SkillValidationResult | SkillValidationSkippedResult;

const slotLabelByKey = new Map(outfitSlotDefinitions.map((slot) => [slot.key, slot.label]));

function slotLabel(slotId: OutfitSlotKey) {
  return slotLabelByKey.get(slotId) ?? slotId;
}

function hasBoundProduct(workflowDraft: WorkflowDraft, slotId: OutfitSlotKey) {
  const asset = workflowDraft.outfitSlots[slotId];
  return Boolean(asset && asset.type === "product" && asset.id.trim());
}

export function countValidSkillProductReferences(workflowDraft: WorkflowDraft) {
  // Count slot-bound references to match the existing GenerationConfig products array.
  return outfitSlotDefinitions.filter((slot) => hasBoundProduct(workflowDraft, slot.key)).length;
}

function requiredSlotIssues(skill: WorkflowSkill, workflowDraft: WorkflowDraft) {
  const issues: SkillValidationIssue[] = [];

  for (const group of skill.requiredInputRule.anyOf ?? []) {
    if (group.some((slotId) => hasBoundProduct(workflowDraft, slotId))) {
      continue;
    }

    issues.push({
      code: skillValidationCodes.requiredSlotMissing,
      severity: "error",
      message: `At least one of ${group.map(slotLabel).join(" or ")} is required for ${skill.name}.`,
      slotIds: group
    });
  }

  for (const slotId of skill.requiredInputRule.allOf ?? []) {
    if (hasBoundProduct(workflowDraft, slotId)) {
      continue;
    }

    issues.push({
      code: skillValidationCodes.requiredSlotMissing,
      severity: "error",
      message: `${slotLabel(slotId)} is required for ${skill.name}.`,
      slotIds: [slotId]
    });
  }

  return issues;
}

function minimumReferenceIssues(skill: WorkflowSkill, workflowDraft: WorkflowDraft, validProductReferenceCount: number) {
  const minimum = skill.requiredInputRule.minValidProductReferences;

  if (!minimum || validProductReferenceCount >= minimum) {
    return [];
  }

  return [
    {
      code: skillValidationCodes.minProductReferencesNotMet,
      severity: "error",
      message: `${skill.name} requires at least ${minimum} valid outfit/product references.`
    } satisfies SkillValidationIssue
  ];
}

function warningIssues(skill: WorkflowSkill, workflowDraft: WorkflowDraft) {
  if (skill.id !== "SK04_PROP_STYLING") {
    return [];
  }

  const hasPropContext =
    hasBoundProduct(workflowDraft, "prop01") || hasBoundProduct(workflowDraft, "prop02") || Boolean(workflowDraft.scene.reference);

  if (hasPropContext) {
    return [];
  }

  return [
    {
      code: skillValidationCodes.propContextMissing,
      severity: "warning",
      message: "Prop Styling works best with a supporting prop or scene reference.",
      slotIds: ["prop01", "prop02"]
    } satisfies SkillValidationIssue
  ];
}

export function validateSkillInput(skillId: WorkflowSkillId, workflowDraft: WorkflowDraft): SkillValidationResult;
export function validateSkillInput(skill: WorkflowSkill, workflowDraft: WorkflowDraft): SkillValidationResult;
export function validateSkillInput(skillOrId: WorkflowSkill | WorkflowSkillId, workflowDraft: WorkflowDraft): SkillValidationResult {
  const skill = typeof skillOrId === "string" ? getWorkflowSkill(skillOrId) : skillOrId;
  const validProductReferenceCount = countValidSkillProductReferences(workflowDraft);
  const issues = [
    ...requiredSlotIssues(skill, workflowDraft),
    ...minimumReferenceIssues(skill, workflowDraft, validProductReferenceCount),
    ...warningIssues(skill, workflowDraft)
  ];
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const hasWarnings = issues.some((issue) => issue.severity === "warning");

  return {
    skillId: skill.id,
    status: hasErrors ? "fail" : hasWarnings ? "warning" : "pass",
    issues,
    metrics: {
      validProductReferenceCount,
      requiredSatisfied: !hasErrors
    }
  };
}

export function validateSelectedSkillInput(workflowDraft: WorkflowDraft): SkillValidationCheckResult {
  if (!workflowDraft.selectedSkillId) {
    return {
      skillId: null,
      status: "skipped",
      issues: [],
      metrics: {
        validProductReferenceCount: countValidSkillProductReferences(workflowDraft),
        requiredSatisfied: true
      }
    };
  }

  if (!isWorkflowSkillId(workflowDraft.selectedSkillId)) {
    return {
      skillId: "SK01_MINIMAL_FLAT_LAY",
      status: "fail",
      issues: [
        {
          code: skillValidationCodes.skillNotFound,
          severity: "error",
          message: "Selected Skill was not found."
        }
      ],
      metrics: {
        validProductReferenceCount: countValidSkillProductReferences(workflowDraft),
        requiredSatisfied: false
      }
    };
  }

  return validateSkillInput(workflowDraft.selectedSkillId, workflowDraft);
}

import type { GenerationPlan } from "@/features/prompt-compiler/compiler-types";
import type { PromptQAResult } from "@/features/prompt-compiler/prompt-qa-types";
import type { SkillValidationResult } from "@/features/skill/skill-validation";
import type { GenerationConfig, WorkflowSnapshotV1 } from "@/types/domain";

export interface ManualPackageReferenceAsset {
  label: string;
  assetId: string;
  originalFileName: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ManualGenerationPackage {
  version: 1;
  providerId: "chatgpt_manual";
  status: "ready" | "warning" | "blocked";
  summary: string;
  finalPrompt: string;
  promptQA: PromptQAResult;
  skillValidation?: SkillValidationResult;
  workflowSnapshot?: WorkflowSnapshotV1;
  referenceAssets: ManualPackageReferenceAsset[];
  sceneReference: ManualPackageReferenceAsset | null;
  output: {
    aspectRatio: string;
    quality: string;
    count: number;
    mode: string;
  };
  instructions: string[];
  revision?: {
    parentGenerationId: string;
    revisionType: string;
    revisionInstruction: string;
  };
  fullPackageText: string;
}

function packageStatus(promptQA: PromptQAResult, skillValidation?: SkillValidationResult): ManualGenerationPackage["status"] {
  if (skillValidation?.status === "fail" || promptQA.status === "fail") {
    return "blocked";
  }

  if (skillValidation?.status === "warning" || promptQA.status === "warning") {
    return "warning";
  }

  return "ready";
}

function issueText(promptQA: PromptQAResult, skillValidation?: SkillValidationResult) {
  const issues = [
    ...(skillValidation?.issues ?? []).map((issue) => ({ ...issue, source: "Skill" })),
    ...promptQA.issues.map((issue) => ({ ...issue, source: "Prompt QA" }))
  ];

  if (!issues.length) {
    return "None";
  }

  return issues.map((issue) => `- ${issue.source} ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`).join("\n");
}

function referenceChecklist(packageInput: Pick<ManualGenerationPackage, "referenceAssets" | "sceneReference">) {
  const references = [...packageInput.referenceAssets, packageInput.sceneReference].filter(
    (reference): reference is ManualPackageReferenceAsset => Boolean(reference)
  );

  if (!references.length) {
    return "No reference images attached.";
  }

  return references.map((reference, index) => `${index + 1}. ${reference.label} - ${reference.originalFileName}`).join("\n");
}

function buildFullPackageText(input: Omit<ManualGenerationPackage, "fullPackageText">) {
  return [
    input.revision ? "ChatGPT Manual Revision Package" : "ChatGPT Manual Generation Package",
    "",
    "Instructions:",
    input.revision ? "1. Upload the listed reference images and parent result image to ChatGPT manually." : "1. Upload the listed reference images to ChatGPT manually.",
    "2. Paste the final prompt below.",
    "3. Generate the image, save it locally, then return to Outfit Visual Studio and use Import Result.",
    "",
    `Status: ${input.status.toUpperCase()}`,
    `Summary: ${input.summary}`,
    input.revision ? `Revision From: ${input.revision.parentGenerationId}` : null,
    input.revision ? `Revision Type: ${input.revision.revisionType}` : null,
    input.skillValidation ? `Skill Validation: ${input.skillValidation.status.toUpperCase()}` : null,
    "",
    "Reference Images:",
    referenceChecklist(input),
    "",
    "Output:",
    `- Aspect Ratio: ${input.output.aspectRatio}`,
    `- Quality: ${input.output.quality}`,
    `- Count: ${input.output.count}`,
    `- Mode: ${input.output.mode}`,
    "",
    "Product Fidelity:",
    input.finalPrompt.includes("Preserve each uploaded item's original silhouette")
      ? "Preserve uploaded product shape, color, material, graphics, and proportions."
      : "Use uploaded products as creative references; product fidelity is not strict.",
    "",
    "Validation / Prompt QA:",
    issueText(input.promptQA, input.skillValidation),
    "",
    "Final Prompt:",
    input.finalPrompt
  ].filter((line): line is string => line !== null).join("\n");
}

export function buildManualGenerationPackage(
  generationConfig: GenerationConfig,
  generationPlan: GenerationPlan,
  promptQA: PromptQAResult,
  skillValidation?: SkillValidationResult,
  workflowSnapshot?: WorkflowSnapshotV1
): ManualGenerationPackage {
  const referenceAssets = generationConfig.products.map((product) => ({
    label: product.slot.label,
    assetId: product.assetId,
    originalFileName: product.originalFileName,
    publicUrl: product.publicUrl,
    mimeType: product.mimeType,
    width: product.width,
    height: product.height
  }));
  const sceneReference = generationConfig.scene.reference
    ? {
        label: "Scene Reference",
        assetId: generationConfig.scene.reference.id,
        originalFileName: generationConfig.scene.reference.originalFileName,
        publicUrl: generationConfig.scene.reference.publicUrl,
        mimeType: generationConfig.scene.reference.mimeType,
        width: generationConfig.scene.reference.width,
        height: generationConfig.scene.reference.height
      }
    : null;
  const basePackage = {
    version: 1 as const,
    providerId: "chatgpt_manual" as const,
    status: packageStatus(promptQA, skillValidation),
    summary: generationPlan.summary,
    finalPrompt: generationPlan.finalPrompt,
    promptQA,
    skillValidation,
    workflowSnapshot,
    referenceAssets,
    sceneReference,
    output: {
      aspectRatio: generationConfig.output.aspectRatio.value,
      quality: generationConfig.output.quality.value,
      count: generationConfig.output.count.value,
      mode: generationConfig.output.mode.value
    },
    instructions: [
      "Copy the prompt.",
      "Open ChatGPT.",
      "Upload the listed reference images.",
      "Paste the prompt.",
      "Generate the image.",
      "Save the generated image.",
      "Return here and use Import Result."
    ],
    revision: generationPlan.revision
      ? {
          parentGenerationId: generationPlan.revision.parentGenerationId,
          revisionType: generationPlan.revision.revisionType,
          revisionInstruction: generationPlan.revision.instruction
        }
      : undefined
  };

  return {
    ...basePackage,
    fullPackageText: buildFullPackageText(basePackage)
  };
}

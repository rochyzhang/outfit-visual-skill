import type { AssetType, ContentTypeId, GenerationConfig, OutfitSlotDefinition } from "@/types/domain";
import type { WorkflowSkillId } from "@/config/skills";

export const generationPlanVersion = 1;

export interface GenerationPlanProduct {
  slot: OutfitSlotDefinition;
  assetId: string;
  assetType: AssetType;
  originalFileName: string;
  mimeType: string;
  width: number;
  height: number;
  publicUrl: string;
}

export interface GenerationPlanInstructions {
  task: string;
  productReferences: string;
  productFidelity: string;
  composition: string;
  physics: string;
  scene: string;
  camera: string;
  lighting: string;
  color: string;
  contrast: string;
  texture: string;
  mood: string;
  graphic: string | null;
  productConstraints: string;
  revision: string | null;
  output: string;
  prohibitedBehavior: string;
}

export interface GenerationPlanRevision {
  parentGenerationId: string;
  revisionType: string;
  instruction: string;
  preserveUnchanged: true;
}

export interface GenerationPlan {
  version: typeof generationPlanVersion;
  summary: string;
  taskType: "fashion_image_generation_prompt";
  contentType: GenerationConfig["contentType"];
  skillOrigin: {
    id: WorkflowSkillId;
    name: string;
  } | null;
  products: GenerationPlanProduct[];
  instructions: GenerationPlanInstructions;
  revision?: GenerationPlanRevision;
  warnings: string[];
  finalPrompt: string;
}

export type PromptSectionKey =
  | "task"
  | "productReferences"
  | "productFidelity"
  | "composition"
  | "physics"
  | "scene"
  | "camera"
  | "lighting"
  | "color"
  | "contrast"
  | "texture"
  | "mood"
  | "graphic"
  | "revision"
  | "output"
  | "prohibitedBehavior";

export interface PromptSection {
  key: PromptSectionKey;
  heading: string;
  body: string | null;
}

export function contentTypePhrase(contentType: ContentTypeId) {
  switch (contentType) {
    case "men":
      return "menswear";
    case "genderless":
      return "gender-neutral";
    case "couple":
      return "couple styling";
  }
}

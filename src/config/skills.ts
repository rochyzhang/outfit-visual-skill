import type { GenerationProviderId } from "@/config/generation-providers";
import type {
  AspectRatio,
  ContentTypeId,
  CompositionPresetId,
  GraphicPresetId,
  LookPresetId,
  OutputMode,
  OutputQuality,
  OutfitSlotKey,
  ScenePresetId
} from "@/types/domain";

export const workflowSkillIds = [
  "SK01_MINIMAL_FLAT_LAY",
  "SK02_INVISIBLE_EDITORIAL",
  "SK03_LOOK_BREAKDOWN",
  "SK04_PROP_STYLING",
  "SK05_JAPANESE_CATALOG",
  "SK06_KOREAN_STREET_EDITORIAL"
] as const;

export type WorkflowSkillId = (typeof workflowSkillIds)[number];

export type WorkflowSkillContentType = Exclude<ContentTypeId, "couple">;

export type WorkflowSkillCategory = "flatlay" | "editorial" | "breakdown" | "prop_styling" | "catalog";

export type SkillOverrideKey =
  | "scenePresetId"
  | "compositionPresetId"
  | "graphicPresetId"
  | "lookPresetId"
  | "aspectRatio"
  | "quality"
  | "providerId"
  | "notes";

export type SkillInputRule = {
  allOf?: OutfitSlotKey[];
  anyOf?: OutfitSlotKey[][];
  minValidProductReferences?: number;
};

export type WorkflowSkillDefaults = {
  scenePresetId: ScenePresetId;
  compositionPresetId: CompositionPresetId;
  graphicPresetId: GraphicPresetId;
  lookPresetId: LookPresetId;
  aspectRatio: AspectRatio;
  quality: OutputQuality;
  mode: OutputMode;
  productFidelity: true;
};

export type WorkflowSkill = {
  id: WorkflowSkillId;
  name: string;
  description: string;
  supportedContentTypes: [WorkflowSkillContentType, ...WorkflowSkillContentType[]];
  category: WorkflowSkillCategory;
  requiredInputRule: SkillInputRule;
  recommendedSlots: OutfitSlotKey[];
  defaults: WorkflowSkillDefaults;
  supportedOverrides: SkillOverrideKey[];
  safeguards: {
    englishVisibleTextOnly: boolean;
    preserveUploadedProducts: boolean;
  };
  agent: {
    callable: boolean;
    summary: string;
  };
};

export type WorkflowSkillManifest = Omit<WorkflowSkill, "requiredInputRule"> & {
  requiredInputs: SkillInputRule;
};

export type WorkflowSkillOverrideValues = Partial<{
  scenePresetId: ScenePresetId;
  compositionPresetId: CompositionPresetId;
  graphicPresetId: GraphicPresetId;
  lookPresetId: LookPresetId;
  aspectRatio: AspectRatio;
  quality: OutputQuality;
  providerId: GenerationProviderId;
  notes: string;
}>;

export const v1WorkflowSkillSupportedOverrides = [
  "scenePresetId",
  "compositionPresetId",
  "graphicPresetId",
  "lookPresetId",
  "aspectRatio",
  "quality",
  "providerId",
  "notes"
] as const satisfies SkillOverrideKey[];

const standardRecommendedSlots = [
  "hat",
  "socks",
  "bag",
  "glasses",
  "accessory01",
  "accessory02",
  "prop01",
  "prop02"
] as const satisfies OutfitSlotKey[];

const standardSingleOutfitRule = {
  allOf: ["bottom", "shoes"],
  anyOf: [["top", "outer"]]
} satisfies SkillInputRule;

const preserveUploadedProductsSafeguard = {
  englishVisibleTextOnly: false,
  preserveUploadedProducts: true
} satisfies WorkflowSkill["safeguards"];

const englishVisibleTextSafeguard = {
  englishVisibleTextOnly: true,
  preserveUploadedProducts: true
} satisfies WorkflowSkill["safeguards"];

export const workflowSkills = [
  {
    id: "SK01_MINIMAL_FLAT_LAY",
    name: "Minimal Flat Lay",
    description: "Clean, easy-to-read outfit flat lay for menswear and genderless styling.",
    supportedContentTypes: ["men", "genderless"],
    category: "flatlay",
    requiredInputRule: standardSingleOutfitRule,
    recommendedSlots: standardRecommendedSlots,
    defaults: {
      scenePresetId: "S01",
      compositionPresetId: "C02",
      graphicPresetId: "None",
      lookPresetId: "L02",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: preserveUploadedProductsSafeguard,
    agent: {
      callable: true,
      summary: "Use for a clean single-outfit flat lay with product fidelity preserved."
    }
  },
  {
    id: "SK02_INVISIBLE_EDITORIAL",
    name: "Clean Editorial Flat Lay",
    description: "Clean human-absent editorial flat lay with pale studio surface, clear product separation, and restrained spacing.",
    supportedContentTypes: ["men", "genderless"],
    category: "editorial",
    requiredInputRule: standardSingleOutfitRule,
    recommendedSlots: standardRecommendedSlots,
    defaults: {
      scenePresetId: "S01",
      compositionPresetId: "C02",
      graphicPresetId: "None",
      lookPresetId: "L02",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: preserveUploadedProductsSafeguard,
    agent: {
      callable: true,
      summary: "Use for a clean editorial flat lay with product fidelity preserved, clear spacing, and no human body implied."
    }
  },
  {
    id: "SK03_LOOK_BREAKDOWN",
    name: "Look Breakdown",
    description: "Editorial outfit breakdown combining a hero look with product-item explanation.",
    supportedContentTypes: ["men", "genderless"],
    category: "breakdown",
    requiredInputRule: {
      minValidProductReferences: 3
    },
    recommendedSlots: standardRecommendedSlots,
    defaults: {
      scenePresetId: "S01",
      compositionPresetId: "C05",
      graphicPresetId: "G01",
      lookPresetId: "L02",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: englishVisibleTextSafeguard,
    agent: {
      callable: true,
      summary: "Use for a single-outfit hero look plus product breakdown with English-only visible labels."
    }
  },
  {
    id: "SK04_PROP_STYLING",
    name: "Prop Styling",
    description: "Lifestyle/editorial outfit arrangement around a chair, furniture piece, or styling object.",
    supportedContentTypes: ["men", "genderless"],
    category: "prop_styling",
    requiredInputRule: {
      allOf: ["bottom"],
      anyOf: [["top", "outer"]]
    },
    recommendedSlots: ["shoes", ...standardRecommendedSlots],
    defaults: {
      scenePresetId: "S01",
      compositionPresetId: "C03",
      graphicPresetId: "None",
      lookPresetId: "L02",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: preserveUploadedProductsSafeguard,
    agent: {
      callable: true,
      summary: "Use for lifestyle or editorial object styling where props are helpful but optional."
    }
  },
  {
    id: "SK05_JAPANESE_CATALOG",
    name: "Japanese Catalog",
    description: "Japanese magazine/catalog-inspired styling with English catalog information and limited Japanese editorial accent text.",
    supportedContentTypes: ["men", "genderless"],
    category: "catalog",
    requiredInputRule: standardSingleOutfitRule,
    recommendedSlots: standardRecommendedSlots,
    defaults: {
      scenePresetId: "S05",
      compositionPresetId: "C02",
      graphicPresetId: "G04",
      lookPresetId: "L05",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: preserveUploadedProductsSafeguard,
    agent: {
      callable: true,
      summary: "Use for Japanese catalog-inspired single-outfit styling with English product information and limited Japanese editorial accent text."
    }
  },
  {
    id: "SK06_KOREAN_STREET_EDITORIAL",
    name: "Korean Street Editorial",
    description: "Korean streetwear / Seoul editorial-inspired outfit visual using English-only annotations.",
    supportedContentTypes: ["men", "genderless"],
    category: "editorial",
    requiredInputRule: standardSingleOutfitRule,
    recommendedSlots: standardRecommendedSlots,
    defaults: {
      scenePresetId: "S02",
      compositionPresetId: "C04",
      graphicPresetId: "G02",
      lookPresetId: "L01",
      aspectRatio: "3:4",
      quality: "standard",
      mode: "single",
      productFidelity: true
    },
    supportedOverrides: v1WorkflowSkillSupportedOverrides,
    safeguards: englishVisibleTextSafeguard,
    agent: {
      callable: true,
      summary: "Use for Korean streetwear or Seoul editorial-inspired styling with English-only visible annotations."
    }
  }
] as const satisfies WorkflowSkill[];

const workflowSkillIdSet = new Set<WorkflowSkillId>(workflowSkillIds);

export function isWorkflowSkillId(value: unknown): value is WorkflowSkillId {
  return typeof value === "string" && workflowSkillIdSet.has(value as WorkflowSkillId);
}

export function listWorkflowSkills(): WorkflowSkill[] {
  return [...workflowSkills];
}

export function getWorkflowSkill(id: WorkflowSkillId): WorkflowSkill {
  const skill = workflowSkills.find((item) => item.id === id);

  if (!skill) {
    throw new Error(`Unknown workflow skill id: ${id}`);
  }

  return skill;
}

export function toWorkflowSkillManifest({ requiredInputRule, ...skill }: WorkflowSkill): WorkflowSkillManifest {
  return {
    ...skill,
    requiredInputs: requiredInputRule
  };
}

export function listWorkflowSkillManifests(): WorkflowSkillManifest[] {
  return workflowSkills.map(toWorkflowSkillManifest);
}







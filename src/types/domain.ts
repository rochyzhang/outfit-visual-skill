import type { GenerationProviderId } from "@/config/generation-providers";
import type { WorkflowSkillId } from "@/config/skills";

export type ContentTypeId = "men" | "genderless" | "couple";

export interface ContentTypeOption {
  id: ContentTypeId;
  label: string;
}

export type OutfitSlotKey =
  | "hat"
  | "glasses"
  | "neck"
  | "inner"
  | "top"
  | "outer"
  | "bottom"
  | "socks"
  | "shoes"
  | "bag"
  | "accessory01"
  | "accessory02"
  | "prop01"
  | "prop02";

export interface OutfitSlotDefinition {
  key: OutfitSlotKey;
  label: string;
  category: "head" | "upper" | "lower" | "footwear" | "carry" | "accessory" | "prop";
  order: number;
  optional: boolean;
}

export type ScenePresetId = "S01" | "S02" | "S03" | "S04" | "S05" | "S06";
export type CompositionPresetId = "C01" | "C02" | "C03" | "C04" | "C05";
export type GraphicPresetId = "None" | "G01" | "G02" | "G03" | "G04";
export type LookPresetId = "L01" | "L02" | "L03" | "L04" | "L05" | "L06";

export interface ScenePreset {
  id: ScenePresetId;
  name: string;
  shortDescription: string;
  background: string;
  surface: string;
  environment: string;
  promptFragment: string | null;
  tags: string[];
  visual: PresetVisual;
}

export interface CompositionPreset {
  id: CompositionPresetId;
  name: string;
  shortDescription: string;
  compositionPrompt: string;
  physicsPrompt: string;
  cameraPrompt: string;
  requirements: string[];
  tags: string[];
  supportsCouple?: boolean;
  supportsModel?: boolean;
  supportsGraphicOverlay?: boolean;
}

export interface GraphicPreset {
  id: GraphicPresetId;
  name: string;
  shortDescription: string;
  promptFragment: string | null;
  tags: string[];
}

export interface LookPreset {
  id: LookPresetId;
  name: string;
  shortDescription: string;
  lighting: string;
  colorPalette: string;
  contrast: string;
  texture: string;
  mood: string;
  promptFragment: string;
  tags: string[];
  visual: PresetVisual;
}

export type AspectRatio = "3:4" | "4:5" | "1:1" | "9:16";
export type OutputCount = 1 | 2 | 4;
export type OutputQuality = "draft" | "standard" | "high";
export type OutputMode = "single" | "variations" | "series";

export interface OutputOption<TValue extends string | number> {
  value: TValue;
  label: string;
}

export interface OutputConfig {
  providerId: GenerationProviderId;
  aspectRatio: AspectRatio;
  count: OutputCount;
  quality: OutputQuality;
  mode: OutputMode;
}

export type AssetType = "product" | "scene_reference";

export interface Asset {
  id: string;
  type: AssetType;
  fileName: string;
  originalFileName: string;
  relativePath: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface WorkflowDraft {
  selectedSkillId?: WorkflowSkillId | null;
  contentType: ContentTypeId;
  productFidelity: boolean;
  outfitSlots: Record<OutfitSlotKey, Asset | null>;
  scene: {
    preset: ScenePresetId;
    reference: Asset | null;
    customPrompt: string;
  };
  composition: {
    preset: CompositionPresetId;
    graphic: GraphicPresetId;
  };
  look: LookPresetId;
  output: OutputConfig;
}

export interface WorkflowSnapshotV1 {
  selectedSkillId: WorkflowSkillId | null;
  contentType: ContentTypeId;
  productFidelity: boolean;
  outfitSlots: Record<OutfitSlotKey, string | null>;
  scene: {
    presetId: ScenePresetId;
    sceneReferenceAssetId: string | null;
    customPrompt: string;
  };
  composition: {
    presetId: CompositionPresetId;
    graphicPresetId: GraphicPresetId;
  };
  look: {
    presetId: LookPresetId;
  };
  output: OutputConfig;
}

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationConfig {
  skillOrigin: {
    id: WorkflowSkillId;
    name: string;
  } | null;
  provider: OutputOption<GenerationProviderId> & {
    mode: "manual" | "api";
    description: string;
    generateNote: string;
  };
  contentType: ContentTypeOption;
  productFidelity: boolean;
  products: Array<{
    slot: OutfitSlotDefinition;
    assetId: string;
    assetType: AssetType;
    fileName: string;
    originalFileName: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    publicUrl: string;
  }>;
  scene: ScenePreset & {
    customPrompt: string;
    reference: Asset | null;
    resolvedPromptFragment: string | null;
  };
  composition: CompositionPreset;
  graphic: GraphicPreset;
  look: LookPreset;
  output: {
    aspectRatio: OutputOption<AspectRatio>;
    count: OutputOption<OutputCount>;
    quality: OutputOption<OutputQuality>;
    mode: OutputOption<OutputMode>;
  };
  promptFragments: {
    composition: string;
    physics: string;
    scene: string | null;
    camera: string;
    lighting: string;
    color: string;
    contrast: string;
    texture: string;
    mood: string;
    graphic: string | null;
    output: string;
  };
}

export type PresetVisual = "plain" | "sage" | "concrete" | "burgundy" | "warm" | "retro";




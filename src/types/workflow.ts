import type { WorkflowSkillId } from "@/config/skills";
import type {
  Asset,
  OutfitSlotKey,
  OutputConfig,
  WorkflowDraft
} from "./domain";

export type { Asset, OutfitSlotKey, OutputConfig, WorkflowDraft };
export type {
  AspectRatio,
  AssetType,
  CompositionPresetId,
  ContentTypeId,
  GraphicPresetId,
  LookPresetId,
  OutputCount,
  OutputMode,
  OutputQuality,
  ScenePresetId
} from "./domain";

export type WorkflowState = WorkflowDraft & { selectedSkillId: WorkflowSkillId | null };


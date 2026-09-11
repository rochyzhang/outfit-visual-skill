"use client";

import { create } from "zustand";
import { defaultGenerationProviderId, type GenerationProviderId } from "@/config/generation-providers";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { getWorkflowSkill, type WorkflowSkillContentType, type WorkflowSkillId } from "@/config/skills";
import type {
  Asset,
  AspectRatio,
  CompositionPresetId,
  ContentTypeId,
  GraphicPresetId,
  LookPresetId,
  OutfitSlotDefinition,
  OutfitSlotKey,
  OutputCount,
  OutputMode,
  OutputQuality,
  ScenePresetId,
  WorkflowDraft
} from "@/types/domain";
import type { WorkflowState } from "@/types/workflow";

function createInitialSlots(): Record<OutfitSlotKey, Asset | null> {
  return Object.fromEntries(outfitSlotDefinitions.map((slot) => [slot.key, null])) as Record<
    OutfitSlotKey,
    Asset | null
  >;
}

export function createDefaultWorkflowState(): WorkflowState {
  return {
    selectedSkillId: null,
    contentType: "men",
    productFidelity: true,
    outfitSlots: createInitialSlots(),
    scene: {
      preset: "S01",
      reference: null,
      customPrompt: ""
    },
    composition: {
      preset: "C01",
      graphic: "None"
    },
    look: "L01",
    output: {
      providerId: defaultGenerationProviderId,
      aspectRatio: "3:4",
      count: 1,
      quality: "standard",
      mode: "single"
    }
  };
}

export function workflowStateToDraft(workflowState: WorkflowDraft): WorkflowDraft {
  return workflowState;
}

interface WorkflowActions {
  hydrateWorkflow: (workflow: WorkflowDraft) => void;
  selectSkill: (skillId: WorkflowSkillId) => void;
  applySkill: (skillId: WorkflowSkillId) => void;
  clearSkillSelection: () => void;
  setContentType: (contentType: ContentTypeId) => void;
  setProductFidelity: (enabled: boolean) => void;
  setOutfitSlotAsset: (slot: OutfitSlotDefinition, asset: Asset) => void;
  removeOutfitSlotAsset: (slot: OutfitSlotDefinition) => void;
  setScenePreset: (preset: ScenePresetId) => void;
  setSceneReferenceAsset: (asset: Asset) => void;
  removeSceneReferenceAsset: () => void;
  setSceneCustomPrompt: (prompt: string) => void;
  setCompositionPreset: (preset: CompositionPresetId) => void;
  setGraphicPreset: (preset: GraphicPresetId) => void;
  setLookPreset: (preset: LookPresetId) => void;
  setGenerationProvider: (providerId: GenerationProviderId) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setCount: (count: OutputCount) => void;
  setQuality: (quality: OutputQuality) => void;
  setMode: (mode: OutputMode) => void;
  resetWorkflow: () => void;
  getWorkflowDraft: () => WorkflowDraft;
}

export type WorkflowStore = WorkflowState & WorkflowActions;

// Canonical workflow state stores backend Asset metadata only. Temporary File
// objects and blob URLs are intentionally kept out of this store.
export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  ...createDefaultWorkflowState(),

  hydrateWorkflow: (workflow) => set({ ...workflow, selectedSkillId: workflow.selectedSkillId ?? null }),

  selectSkill: (selectedSkillId) => set({ selectedSkillId }),

  applySkill: (skillId) =>
    set((state) => {
      const skill = getWorkflowSkill(skillId);
      const contentType = skill.supportedContentTypes.includes(state.contentType as WorkflowSkillContentType)
        ? state.contentType
        : skill.supportedContentTypes[0];

      return {
        selectedSkillId: skill.id,
        contentType,
        productFidelity: skill.defaults.productFidelity,
        scene: {
          ...state.scene,
          preset: skill.defaults.scenePresetId
        },
        composition: {
          preset: skill.defaults.compositionPresetId,
          graphic: skill.defaults.graphicPresetId
        },
        look: skill.defaults.lookPresetId,
        output: {
          ...state.output,
          aspectRatio: skill.defaults.aspectRatio,
          quality: skill.defaults.quality,
          mode: skill.defaults.mode
        }
      };
    }),

  clearSkillSelection: () => set({ selectedSkillId: null }),

  setContentType: (contentType) => set({ contentType }),
  setProductFidelity: (productFidelity) => set({ productFidelity }),

  setOutfitSlotAsset: (slot, asset) =>
    set((state) => ({
      outfitSlots: {
        ...state.outfitSlots,
        [slot.key]: asset
      }
    })),

  removeOutfitSlotAsset: (slot) =>
    set((state) => ({
      outfitSlots: {
        ...state.outfitSlots,
        [slot.key]: null
      }
    })),

  setScenePreset: (preset) =>
    set((state) => ({
      scene: { ...state.scene, preset }
    })),

  setSceneReferenceAsset: (asset) =>
    set((state) => ({
      scene: {
        ...state.scene,
        reference: asset
      }
    })),

  removeSceneReferenceAsset: () =>
    set((state) => ({
      scene: {
        ...state.scene,
        reference: null
      }
    })),

  setSceneCustomPrompt: (customPrompt) =>
    set((state) => ({
      scene: { ...state.scene, customPrompt }
    })),

  setCompositionPreset: (preset) =>
    set((state) => ({
      composition: { ...state.composition, preset }
    })),

  setGraphicPreset: (graphic) =>
    set((state) => ({
      composition: { ...state.composition, graphic }
    })),

  setLookPreset: (look) => set({ look }),

  setGenerationProvider: (providerId) =>
    set((state) => ({
      output: { ...state.output, providerId }
    })),

  setAspectRatio: (aspectRatio) =>
    set((state) => ({
      output: { ...state.output, aspectRatio }
    })),

  setCount: (count) =>
    set((state) => ({
      output: { ...state.output, count }
    })),

  setQuality: (quality) =>
    set((state) => ({
      output: { ...state.output, quality }
    })),

  setMode: (mode) =>
    set((state) => ({
      output: { ...state.output, mode }
    })),

  resetWorkflow: () => set(createDefaultWorkflowState()),

  getWorkflowDraft: () => workflowStateToDraft(get())
}));





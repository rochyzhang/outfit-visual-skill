import { contentTypes } from "@/config/content-types";
import { generationProviderOptions } from "@/config/generation-providers";
import { getWorkflowSkill, isWorkflowSkillId } from "@/config/skills";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { aspectRatioOptions, countOptions, modeOptions, qualityOptions } from "@/config/output-options";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { lookPresets } from "@/config/presets/looks";
import { scenePresets } from "@/config/presets/scenes";
import type {
  AspectRatio,
  CompositionPresetId,
  ContentTypeId,
  GenerationConfig,
  GraphicPresetId,
  LookPresetId,
  OutputCount,
  OutputMode,
  OutputQuality,
  ScenePresetId,
  WorkflowDraft
} from "@/types/domain";

function findById<TItem extends { id: string }>(items: TItem[], id: string, label: string) {
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Unknown ${label}: ${id}`);
  }

  return item;
}

function findByValue<TValue extends string | number, TItem extends { value: TValue }>(
  items: TItem[],
  value: TValue,
  label: string
) {
  const item = items.find((candidate) => candidate.value === value);

  if (!item) {
    throw new Error(`Unknown ${label}: ${value}`);
  }

  return item;
}

export function buildGenerationConfig(workflowDraft: WorkflowDraft): GenerationConfig {
  const skillOrigin = isWorkflowSkillId(workflowDraft.selectedSkillId)
    ? { id: workflowDraft.selectedSkillId, name: getWorkflowSkill(workflowDraft.selectedSkillId).name }
    : null;
  const contentType = findById(contentTypes, workflowDraft.contentType satisfies ContentTypeId, "content type");
  const scene = findById(scenePresets, workflowDraft.scene.preset satisfies ScenePresetId, "scene preset");
  const composition = findById(
    compositionPresets,
    workflowDraft.composition.preset satisfies CompositionPresetId,
    "composition preset"
  );
  const graphic = findById(graphicPresets, workflowDraft.composition.graphic satisfies GraphicPresetId, "graphic preset");
  const look = findById(lookPresets, workflowDraft.look satisfies LookPresetId, "look preset");

  const products = outfitSlotDefinitions.flatMap((slot) => {
    const file = workflowDraft.outfitSlots[slot.key];

    if (!file) {
      return [];
    }

    return [
      {
        slot,
        assetId: file.id,
        assetType: file.type,
        fileName: file.fileName,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        sizeBytes: file.sizeBytes,
        publicUrl: file.publicUrl
      }
    ];
  });

  const scenePrompt =
    scene.id === "S06"
      ? workflowDraft.scene.customPrompt.trim() || null
      : scene.promptFragment;

  return {
    skillOrigin,
    provider: findByValue(generationProviderOptions, workflowDraft.output.providerId, "generation provider"),
    contentType,
    productFidelity: workflowDraft.productFidelity,
    products,
    scene: {
      ...scene,
      customPrompt: workflowDraft.scene.customPrompt,
      reference: workflowDraft.scene.reference,
      resolvedPromptFragment: scenePrompt
    },
    composition,
    graphic,
    look,
    output: {
      aspectRatio: findByValue(aspectRatioOptions, workflowDraft.output.aspectRatio satisfies AspectRatio, "aspect ratio"),
      count: findByValue(countOptions, workflowDraft.output.count satisfies OutputCount, "count"),
      quality: findByValue(qualityOptions, workflowDraft.output.quality satisfies OutputQuality, "quality"),
      mode: findByValue(modeOptions, workflowDraft.output.mode satisfies OutputMode, "mode")
    },
    promptFragments: {
      composition: composition.compositionPrompt,
      physics: composition.physicsPrompt,
      scene: scenePrompt,
      camera: composition.cameraPrompt,
      lighting: look.lighting,
      color: look.colorPalette,
      contrast: look.contrast,
      texture: look.texture,
      mood: look.mood,
      graphic: graphic.promptFragment,
      output: `aspect ratio ${workflowDraft.output.aspectRatio}, count ${workflowDraft.output.count}, quality ${workflowDraft.output.quality}, mode ${workflowDraft.output.mode}`
    }
  };
}

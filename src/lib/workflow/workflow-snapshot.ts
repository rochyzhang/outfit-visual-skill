import { contentTypes } from "@/config/content-types";
import { defaultGenerationProviderId, isGenerationProviderId } from "@/config/generation-providers";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { aspectRatioOptions, countOptions, modeOptions, qualityOptions } from "@/config/output-options";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { lookPresets } from "@/config/presets/looks";
import { scenePresets } from "@/config/presets/scenes";
import { isWorkflowSkillId } from "@/config/skills";
import type {
  Asset,
  CompositionPresetId,
  ContentTypeId,
  GraphicPresetId,
  LookPresetId,
  OutfitSlotKey,
  ScenePresetId,
  WorkflowDraft,
  WorkflowSnapshotV1
} from "@/types/domain";

export const workflowVersion = 1;

export interface SnapshotValidationResult {
  snapshot: WorkflowSnapshotV1;
  warnings: string[];
}

const contentTypeIds = new Set(contentTypes.map((item) => item.id));
const scenePresetIds = new Set(scenePresets.map((item) => item.id));
const compositionPresetIds = new Set(compositionPresets.map((item) => item.id));
const graphicPresetIds = new Set(graphicPresets.map((item) => item.id));
const lookPresetIds = new Set(lookPresets.map((item) => item.id));
const aspectRatioValues = new Set(aspectRatioOptions.map((item) => item.value));
const countValues = new Set(countOptions.map((item) => item.value));
const qualityValues = new Set(qualityOptions.map((item) => item.value));
const modeValues = new Set(modeOptions.map((item) => item.value));
const outfitSlotKeys = outfitSlotDefinitions.map((slot) => slot.key);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrFallback<TValue extends string>(
  value: unknown,
  allowed: Set<TValue>,
  fallback: TValue,
  label: string,
  warnings: string[]
): TValue {
  if (typeof value === "string" && allowed.has(value as TValue)) {
    return value as TValue;
  }

  warnings.push(`${label} was invalid and fell back to ${fallback}.`);
  return fallback;
}

function countOrFallback(value: unknown, fallback: WorkflowSnapshotV1["output"]["count"], warnings: string[]) {
  if (typeof value === "number" && countValues.has(value as WorkflowSnapshotV1["output"]["count"])) {
    return value as WorkflowSnapshotV1["output"]["count"];
  }

  warnings.push(`Output count was invalid and fell back to ${fallback}.`);
  return fallback;
}

function assetIdOrNull(value: unknown, warnings: string[], label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  warnings.push(`${label} asset reference was invalid and was cleared.`);
  return null;
}

export function workflowDraftToSnapshot(workflowDraft: WorkflowDraft): WorkflowSnapshotV1 {
  return {
    selectedSkillId: workflowDraft.selectedSkillId ?? null,
    contentType: workflowDraft.contentType,
    productFidelity: workflowDraft.productFidelity,
    outfitSlots: Object.fromEntries(
      outfitSlotKeys.map((slotKey) => [slotKey, workflowDraft.outfitSlots[slotKey]?.id ?? null])
    ) as WorkflowSnapshotV1["outfitSlots"],
    scene: {
      presetId: workflowDraft.scene.preset,
      sceneReferenceAssetId: workflowDraft.scene.reference?.id ?? null,
      customPrompt: workflowDraft.scene.customPrompt
    },
    composition: {
      presetId: workflowDraft.composition.preset,
      graphicPresetId: workflowDraft.composition.graphic
    },
    look: {
      presetId: workflowDraft.look
    },
    output: workflowDraft.output
  };
}

export function createDefaultWorkflowSnapshot(): WorkflowSnapshotV1 {
  return {
    selectedSkillId: null,
    contentType: "men",
    productFidelity: true,
    outfitSlots: Object.fromEntries(outfitSlotKeys.map((slotKey) => [slotKey, null])) as WorkflowSnapshotV1["outfitSlots"],
    scene: {
      presetId: "S01",
      sceneReferenceAssetId: null,
      customPrompt: ""
    },
    composition: {
      presetId: "C01",
      graphicPresetId: "None"
    },
    look: {
      presetId: "L01"
    },
    output: {
      providerId: defaultGenerationProviderId,
      aspectRatio: "3:4",
      count: 1,
      quality: "standard",
      mode: "single"
    }
  };
}

export function snapshotKey(snapshot: WorkflowSnapshotV1) {
  return JSON.stringify(snapshot);
}

export function validateWorkflowSnapshot(input: unknown): SnapshotValidationResult {
  const warnings: string[] = [];
  const defaults = createDefaultWorkflowSnapshot();
  const record = isRecord(input) ? input : {};

  if (!isRecord(input)) {
    warnings.push("Workflow snapshot was missing or invalid and fell back to defaults.");
  }

  const outfitSlotsInput = isRecord(record.outfitSlots) ? record.outfitSlots : {};
  const outfitSlots = Object.fromEntries(
    outfitSlotKeys.map((slotKey) => [
      slotKey,
      assetIdOrNull(outfitSlotsInput[slotKey], warnings, `Outfit slot ${slotKey}`)
    ])
  ) as WorkflowSnapshotV1["outfitSlots"];

  Object.keys(outfitSlotsInput)
    .filter((slotKey) => !outfitSlotKeys.includes(slotKey as OutfitSlotKey))
    .forEach((slotKey) => warnings.push(`Unknown outfit slot ${slotKey} was ignored.`));

  const sceneInput = isRecord(record.scene) ? record.scene : {};
  const compositionInput = isRecord(record.composition) ? record.composition : {};
  const lookInput = isRecord(record.look) ? record.look : {};
  const outputInput = isRecord(record.output) ? record.output : {};
  const providerId = isGenerationProviderId(outputInput.providerId)
    ? outputInput.providerId
    : defaults.output.providerId;

  if (outputInput.providerId !== undefined && !isGenerationProviderId(outputInput.providerId)) {
    warnings.push(`Generation provider was invalid and fell back to ${defaults.output.providerId}.`);
  }

  return {
    snapshot: {
      selectedSkillId: isWorkflowSkillId(record.selectedSkillId) ? record.selectedSkillId : null,
      contentType: stringOrFallback(
        record.contentType,
        contentTypeIds,
        defaults.contentType satisfies ContentTypeId,
        "Content type",
        warnings
      ),
      productFidelity: typeof record.productFidelity === "boolean" ? record.productFidelity : defaults.productFidelity,
      outfitSlots,
      scene: {
        presetId: stringOrFallback(
          sceneInput.presetId,
          scenePresetIds,
          defaults.scene.presetId satisfies ScenePresetId,
          "Scene preset",
          warnings
        ),
        sceneReferenceAssetId: assetIdOrNull(sceneInput.sceneReferenceAssetId, warnings, "Scene reference"),
        customPrompt: typeof sceneInput.customPrompt === "string" ? sceneInput.customPrompt : defaults.scene.customPrompt
      },
      composition: {
        presetId: stringOrFallback(
          compositionInput.presetId,
          compositionPresetIds,
          defaults.composition.presetId satisfies CompositionPresetId,
          "Composition preset",
          warnings
        ),
        graphicPresetId: stringOrFallback(
          compositionInput.graphicPresetId,
          graphicPresetIds,
          defaults.composition.graphicPresetId satisfies GraphicPresetId,
          "Graphic preset",
          warnings
        )
      },
      look: {
        presetId: stringOrFallback(
          lookInput.presetId,
          lookPresetIds,
          defaults.look.presetId satisfies LookPresetId,
          "Look preset",
          warnings
        )
      },
      output: {
        providerId,
        aspectRatio: stringOrFallback(
          outputInput.aspectRatio,
          aspectRatioValues,
          defaults.output.aspectRatio,
          "Aspect ratio",
          warnings
        ),
        count: countOrFallback(outputInput.count, defaults.output.count, warnings),
        quality: stringOrFallback(outputInput.quality, qualityValues, defaults.output.quality, "Output quality", warnings),
        mode: stringOrFallback(outputInput.mode, modeValues, defaults.output.mode, "Output mode", warnings)
      }
    },
    warnings
  };
}

export function resolveWorkflowSnapshot(input: {
  snapshot: WorkflowSnapshotV1;
  assetsById: Map<string, Asset>;
}): { workflow: WorkflowDraft; warnings: string[] } {
  const warnings: string[] = [];

  function resolveAsset(assetId: string | null, label: string) {
    if (!assetId) {
      return null;
    }

    const asset = input.assetsById.get(assetId);

    if (!asset) {
      warnings.push(`${label} asset ${assetId} is missing and was cleared.`);
      return null;
    }

    return asset;
  }

  return {
    workflow: {
      selectedSkillId: input.snapshot.selectedSkillId,
      contentType: input.snapshot.contentType,
      productFidelity: input.snapshot.productFidelity,
      outfitSlots: Object.fromEntries(
        outfitSlotKeys.map((slotKey) => [
          slotKey,
          resolveAsset(input.snapshot.outfitSlots[slotKey], `Outfit slot ${slotKey}`)
        ])
      ) as WorkflowDraft["outfitSlots"],
      scene: {
        preset: input.snapshot.scene.presetId,
        reference: resolveAsset(input.snapshot.scene.sceneReferenceAssetId, "Scene reference"),
        customPrompt: input.snapshot.scene.customPrompt
      },
      composition: {
        preset: input.snapshot.composition.presetId,
        graphic: input.snapshot.composition.graphicPresetId
      },
      look: input.snapshot.look.presetId,
      output: input.snapshot.output
    },
    warnings
  };
}



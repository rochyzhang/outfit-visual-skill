"use client";

import { create } from "zustand";
import type { GenerationProviderId } from "@/config/generation-providers";
import type { WorkflowSkillId } from "@/config/skills";
import type { AspectRatio, CompositionPresetId, LookPresetId, OutputQuality } from "@/types/domain";

export type GenerationResultStatus = "empty" | "queued" | "generating" | "success" | "error";

export interface GenerationResultState {
  status: GenerationResultStatus;
  generationId?: string;
  skillId?: WorkflowSkillId | null;
  skillName?: string | null;
  imageId?: string;
  imageUrl?: string;
  providerId?: GenerationProviderId;
  model?: string;
  originalFileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  aspectRatio?: AspectRatio;
  quality?: OutputQuality;
  compositionId?: CompositionPresetId;
  lookId?: LookPresetId;
  errorCode?: string;
  errorMessage?: string;
  previousSuccess?: GenerationSuccessSnapshot;
}

type GenerationSnapshotFields = Pick<GenerationResultState, "generationId" | "skillId" | "skillName" | "providerId" | "aspectRatio" | "quality" | "compositionId" | "lookId">;
type GenerationSuccessSnapshot = Pick<
  GenerationResultState,
  "generationId" | "skillId" | "skillName" | "imageId" | "imageUrl" | "providerId" | "model" | "originalFileName" | "mimeType" | "width" | "height" | "durationMs" | "aspectRatio" | "quality" | "compositionId" | "lookId"
>;

interface GenerationResultActions {
  resetResult: () => void;
  setQueued: (input?: GenerationSnapshotFields) => void;
  setGenerating: (input?: GenerationSnapshotFields) => void;
  setSuccess: (
    input: Required<Pick<GenerationResultState, "generationId" | "imageUrl" | "aspectRatio" | "quality" | "compositionId" | "lookId">> &
      Pick<GenerationResultState, "skillId" | "skillName" | "imageId" | "providerId" | "model" | "originalFileName" | "mimeType" | "width" | "height" | "durationMs">
  ) => void;
  setError: (input: GenerationSnapshotFields & Pick<GenerationResultState, "errorCode" | "errorMessage">) => void;
}

export type GenerationResultStore = GenerationResultState & GenerationResultActions;

const emptyResultState: GenerationResultState = {
  status: "empty"
};

export const useGenerationResultStore = create<GenerationResultStore>((set) => ({
  ...emptyResultState,

  resetResult: () => set(emptyResultState),

  setQueued: (input = {}) =>
    set((state) => ({
      status: "queued",
      ...input,
      imageId: undefined,
      imageUrl: undefined,
      model: undefined,
      originalFileName: undefined,
      mimeType: undefined,
      width: undefined,
      height: undefined,
      durationMs: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      previousSuccess: state.status === "success" && state.imageUrl ? successSnapshot(state) : state.previousSuccess
    })),

  setGenerating: (input = {}) =>
    set((state) => ({
      status: "generating",
      ...input,
      imageId: undefined,
      imageUrl: undefined,
      model: undefined,
      originalFileName: undefined,
      mimeType: undefined,
      width: undefined,
      height: undefined,
      durationMs: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      previousSuccess: state.previousSuccess
    })),

  setSuccess: (input) =>
    set({
      status: "success",
      ...input,
      errorCode: undefined,
      errorMessage: undefined,
      previousSuccess: undefined
    }),

  setError: (input) =>
    set((state) => ({
      status: "error",
      generationId: input.generationId,
      aspectRatio: input.aspectRatio,
      quality: input.quality,
      compositionId: input.compositionId,
      lookId: input.lookId,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      imageUrl: undefined,
      imageId: undefined,
      providerId: input.providerId,
      model: undefined,
      originalFileName: undefined,
      mimeType: undefined,
      width: undefined,
      height: undefined,
      durationMs: undefined,
      previousSuccess: state.status === "success" && state.imageUrl ? successSnapshot(state) : state.previousSuccess
    }))
}));

function successSnapshot(state: GenerationResultState): GenerationSuccessSnapshot {
  return {
    generationId: state.generationId,
    skillId: state.skillId,
    skillName: state.skillName,
    imageId: state.imageId,
    imageUrl: state.imageUrl,
    providerId: state.providerId,
    model: state.model,
    originalFileName: state.originalFileName,
    mimeType: state.mimeType,
    width: state.width,
    height: state.height,
    durationMs: state.durationMs,
    aspectRatio: state.aspectRatio,
    quality: state.quality,
    compositionId: state.compositionId,
    lookId: state.lookId
  };
}

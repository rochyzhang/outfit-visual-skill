"use client";

import { create } from "zustand";
import type { SceneReferenceAnalysisResult, SceneRefinementResult } from "@/features/ai/ai-schemas";

type AiOperation = "refine-scene" | "analyze-scene-reference";
type AiStatus = "idle" | "running" | "success" | "error";

interface AiAssistanceState {
  available: boolean | null;
  model: string | null;
  credentialSource: string | null;
  lastOperation: AiOperation | null;
  status: AiStatus;
  summary: string;
  refinement: SceneRefinementResult | null;
  analysis: SceneReferenceAnalysisResult | null;
  setRunning: (operation: AiOperation) => void;
  setSuccess: (input: {
    operation: AiOperation;
    model: string;
    source?: string;
    result: SceneRefinementResult | SceneReferenceAnalysisResult;
    summary: string;
  }) => void;
  setError: (input: { operation: AiOperation; model?: string; available?: boolean; message: string }) => void;
}

export const useAiAssistanceStore = create<AiAssistanceState>((set) => ({
  available: null,
  model: null,
  credentialSource: null,
  lastOperation: null,
  status: "idle",
  summary: "No AI assistance has run.",
  refinement: null,
  analysis: null,

  setRunning: (operation) =>
    set({
      lastOperation: operation,
      status: "running",
      summary: operation === "refine-scene" ? "Refining custom scene text." : "Analyzing scene reference."
    }),

  setSuccess: ({ operation, model, source, result, summary }) =>
    set({
      available: true,
      model,
      credentialSource: source ?? null,
      lastOperation: operation,
      status: "success",
      summary,
      refinement: operation === "refine-scene" ? (result as SceneRefinementResult) : null,
      analysis: operation === "analyze-scene-reference" ? (result as SceneReferenceAnalysisResult) : null
    }),

  setError: ({ operation, model, available, message }) =>
    set({
      available: available ?? false,
      model: model ?? null,
      credentialSource: null,
      lastOperation: operation,
      status: "error",
      summary: message
    })
}));

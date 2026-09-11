"use client";

import { create } from "zustand";
import type { ManualGenerationPackage } from "@/features/generation/manual-generation-package";

interface ManualGenerationState {
  package: ManualGenerationPackage | null;
  panelOpen: boolean;
  lastCopied: "prompt" | "package" | null;
}

interface ManualGenerationActions {
  openPackage: (manualPackage: ManualGenerationPackage) => void;
  closePanel: () => void;
  markCopied: (type: "prompt" | "package") => void;
  clearCopied: () => void;
  clearPackage: () => void;
}

export type ManualGenerationStore = ManualGenerationState & ManualGenerationActions;

export const useManualGenerationStore = create<ManualGenerationStore>((set) => ({
  package: null,
  panelOpen: false,
  lastCopied: null,

  openPackage: (manualPackage) =>
    set({
      package: manualPackage,
      panelOpen: true,
      lastCopied: null
    }),

  closePanel: () => set({ panelOpen: false }),

  markCopied: (lastCopied) => set({ lastCopied }),

  clearCopied: () => set({ lastCopied: null }),

  clearPackage: () =>
    set({
      package: null,
      panelOpen: false,
      lastCopied: null
    })
}));

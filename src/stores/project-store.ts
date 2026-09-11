"use client";

import { create } from "zustand";
import type { ProjectInfo } from "@/types/domain";

export type SaveState = "loading" | "saved" | "unsaved" | "saving" | "error";

interface ProjectState {
  project: ProjectInfo | null;
  workflowVersion: number;
  saveState: SaveState;
  warnings: string[];
  lastSavedSnapshotKey: string | null;
  errorMessage: string | null;
}

interface ProjectActions {
  hydrateProject: (input: {
    project: ProjectInfo;
    workflowVersion: number;
    warnings: string[];
    lastSavedSnapshotKey: string;
  }) => void;
  markUnsaved: () => void;
  markSaving: () => void;
  markSaveFailed: (message: string) => void;
  markSavedIfClean: () => void;
}

export type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set) => ({
  project: null,
  workflowVersion: 1,
  saveState: "loading",
  warnings: [],
  lastSavedSnapshotKey: null,
  errorMessage: null,

  hydrateProject: ({ project, workflowVersion, warnings, lastSavedSnapshotKey }) =>
    set({
      project,
      workflowVersion,
      warnings,
      lastSavedSnapshotKey,
      saveState: "saved",
      errorMessage: null
    }),

  markUnsaved: () =>
    set((state) => ({
      saveState: state.saveState === "loading" || state.saveState === "saving" ? state.saveState : "unsaved"
    })),

  markSaving: () => set({ saveState: "saving", errorMessage: null }),

  markSaveFailed: (message) => set({ saveState: "error", errorMessage: message }),

  markSavedIfClean: () =>
    set((state) => ({
      saveState: state.saveState === "unsaved" ? "saved" : state.saveState
    }))
}));

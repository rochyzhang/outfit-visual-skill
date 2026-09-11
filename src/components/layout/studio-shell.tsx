"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { SettingsPanel } from "@/features/settings/settings-panel";
import { fetchCurrentProject, saveCurrentProject } from "@/lib/projects/project-client";
import { snapshotKey, workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import { useProjectStore } from "@/stores/project-store";
import { useWorkflowStore, workflowStateToDraft } from "@/stores/workflow-store";

export function StudioShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedSkillId = useWorkflowStore((store) => store.selectedSkillId);
  const contentType = useWorkflowStore((store) => store.contentType);
  const productFidelity = useWorkflowStore((store) => store.productFidelity);
  const outfitSlots = useWorkflowStore((store) => store.outfitSlots);
  const scene = useWorkflowStore((store) => store.scene);
  const composition = useWorkflowStore((store) => store.composition);
  const look = useWorkflowStore((store) => store.look);
  const output = useWorkflowStore((store) => store.output);
  const hydrateWorkflow = useWorkflowStore((store) => store.hydrateWorkflow);

  const project = useProjectStore((store) => store.project);
  const saveState = useProjectStore((store) => store.saveState);
  const lastSavedSnapshotKey = useProjectStore((store) => store.lastSavedSnapshotKey);
  const errorMessage = useProjectStore((store) => store.errorMessage);
  const hydrateProject = useProjectStore((store) => store.hydrateProject);
  const markUnsaved = useProjectStore((store) => store.markUnsaved);
  const markSaving = useProjectStore((store) => store.markSaving);
  const markSaveFailed = useProjectStore((store) => store.markSaveFailed);
  const markSavedIfClean = useProjectStore((store) => store.markSavedIfClean);
  const hydratedRef = useRef(false);

  const workflowDraft = useMemo(
    () =>
      workflowStateToDraft({
        selectedSkillId,
        contentType,
        productFidelity,
        outfitSlots,
        scene,
        composition,
        look,
        output
      }),
    [selectedSkillId, contentType, productFidelity, outfitSlots, scene, composition, look, output]
  );

  const currentSnapshot = useMemo(() => workflowDraftToSnapshot(workflowDraft), [workflowDraft]);
  const currentSnapshotKey = useMemo(() => snapshotKey(currentSnapshot), [currentSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        const response = await fetchCurrentProject();

        if (cancelled) {
          return;
        }

        hydrateWorkflow(response.workflow);
        hydrateProject({
          project: response.project,
          workflowVersion: response.workflowVersion,
          warnings: response.warnings,
          lastSavedSnapshotKey: snapshotKey(workflowDraftToSnapshot(response.workflow))
        });
        hydratedRef.current = true;
      } catch (error) {
        markSaveFailed(error instanceof Error ? error.message : "Could not load current project.");
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [hydrateProject, hydrateWorkflow, markSaveFailed]);

  useEffect(() => {
    if (!hydratedRef.current || !lastSavedSnapshotKey || saveState === "saving" || saveState === "loading") {
      return;
    }

    if (currentSnapshotKey === lastSavedSnapshotKey) {
      markSavedIfClean();
      return;
    }

    markUnsaved();
  }, [currentSnapshotKey, lastSavedSnapshotKey, markSavedIfClean, markUnsaved, saveState]);

  async function handleSave() {
    if (!project || saveState === "saving") {
      return;
    }

    markSaving();

    try {
      const response = await saveCurrentProject({
        name: project.name,
        workflowSnapshot: currentSnapshot
      });
      hydrateWorkflow(response.workflow);
      hydrateProject({
        project: response.project,
        workflowVersion: response.workflowVersion,
        warnings: response.warnings,
        lastSavedSnapshotKey: snapshotKey(workflowDraftToSnapshot(response.workflow))
      });
    } catch (error) {
      markSaveFailed(error instanceof Error ? error.message : "Could not save current project.");
    }
  }

  const isLoading = saveState === "loading";

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          Outfit Visual Studio{project ? ` / ${project.name}` : ""}
        </div>
        <div className="studio-actions">
          {errorMessage ? <span className="studio-error">{errorMessage}</span> : null}
          <div className={`studio-status studio-status-${saveState}`}>{isLoading ? "Loading..." : saveStateLabel(saveState)}</div>
          <button className="secondary-button" type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!project || saveState === "saving" || saveState === "loading"}
            onClick={handleSave}
          >
            {saveState === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </header>
      <section className="studio-workspace" aria-label="Workflow studio">
        {isLoading ? (
          <div className="studio-loading" data-testid="studio-loading">
            Loading project...
          </div>
        ) : (
          <WorkflowCanvas />
        )}
      </section>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function saveStateLabel(saveState: string) {
  switch (saveState) {
    case "saved":
      return "Saved";
    case "unsaved":
      return "Unsaved";
    case "saving":
      return "Saving...";
    case "error":
      return "Save failed";
    default:
      return "Loading...";
  }
}


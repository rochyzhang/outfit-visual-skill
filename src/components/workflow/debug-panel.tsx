"use client";

import { useMemo } from "react";
import { contentTypes } from "@/config/content-types";
import { formatBytes } from "@/config/assets";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { useAiAssistanceStore } from "@/stores/ai-assistance-store";
import { useManualGenerationStore } from "@/stores/manual-generation-store";
import { useProjectStore } from "@/stores/project-store";
import { useWorkflowStore, workflowStateToDraft } from "@/stores/workflow-store";
import type { Asset, WorkflowDraft } from "@/types/domain";

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
}

function assetLabel(asset: Asset | null) {
  return asset ? `${asset.originalFileName} (${asset.mimeType})` : "Empty";
}

function assetDetails(asset: Asset | null) {
  if (!asset) {
    return "Empty";
  }

  return `${asset.type} | ${asset.id} | ${asset.originalFileName} | ${asset.mimeType} | ${asset.width}x${asset.height} | ${formatBytes(asset.sizeBytes)}`;
}

function displayContentType(id: WorkflowDraft["contentType"]) {
  return contentTypes.find((type) => type.id === id)?.label ?? id;
}

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const contentType = useWorkflowStore((store) => store.contentType);
  const productFidelity = useWorkflowStore((store) => store.productFidelity);
  const outfitSlots = useWorkflowStore((store) => store.outfitSlots);
  const scene = useWorkflowStore((store) => store.scene);
  const composition = useWorkflowStore((store) => store.composition);
  const look = useWorkflowStore((store) => store.look);
  const output = useWorkflowStore((store) => store.output);
  const resetWorkflow = useWorkflowStore((store) => store.resetWorkflow);
  const project = useProjectStore((store) => store.project);
  const workflowVersion = useProjectStore((store) => store.workflowVersion);
  const saveState = useProjectStore((store) => store.saveState);
  const warnings = useProjectStore((store) => store.warnings);
  const aiAvailable = useAiAssistanceStore((store) => store.available);
  const aiModel = useAiAssistanceStore((store) => store.model);
  const aiCredentialSource = useAiAssistanceStore((store) => store.credentialSource);
  const aiLastOperation = useAiAssistanceStore((store) => store.lastOperation);
  const aiStatus = useAiAssistanceStore((store) => store.status);
  const aiSummary = useAiAssistanceStore((store) => store.summary);
  const aiRefinement = useAiAssistanceStore((store) => store.refinement);
  const aiAnalysis = useAiAssistanceStore((store) => store.analysis);
  const manualPackage = useManualGenerationStore((store) => store.package);

  const state = useMemo(
    () =>
      workflowStateToDraft({
        contentType,
        productFidelity,
        outfitSlots,
        scene,
        composition,
        look,
        output
      }),
    [contentType, productFidelity, outfitSlots, scene, composition, look, output]
  );

  if (!open) {
    return null;
  }

  const generationConfig = buildGenerationConfig(state);
  const generationPlan = compileGenerationPlan(generationConfig);
  const promptQA = validateGenerationPlan(generationPlan, generationConfig);

  function handleReset() {
    resetWorkflow();
    onClose();
  }

  return (
    <aside className="debug-panel" aria-label="Workflow debug panel" data-testid="debug-panel">
      <div className="debug-panel-header">
        <div>
          <h2>Debug Panel</h2>
          <p>Current local workflow state.</p>
          <p className="debug-source">State Source: Zustand / hydrated from SQLite</p>
        </div>
        <div className="debug-panel-actions">
          <button className="secondary-button" type="button" data-testid="reset-workflow" onClick={handleReset}>
            Reset Workflow
          </button>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="debug-section">
        <h3>Project / Persistence</h3>
        <dl className="debug-list">
          <div>
            <dt>Project ID</dt>
            <dd>{project?.id ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Project Name</dt>
            <dd>{project?.name ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Workflow Version</dt>
            <dd>{workflowVersion}</dd>
          </div>
          <div>
            <dt>Persistence Source</dt>
            <dd>SQLite</dd>
          </div>
          <div>
            <dt>Save State</dt>
            <dd>{saveState}</dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{warnings.length ? warnings.join(" | ") : "None"}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Workflow State</h3>
        <dl className="debug-list">
          <div>
            <dt>Content Type</dt>
            <dd>{displayContentType(state.contentType)}</dd>
          </div>
          <div>
            <dt>Product Fidelity</dt>
            <dd>{state.productFidelity ? "ON" : "OFF"}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Outfit</h3>
        <dl className="debug-list">
          {outfitSlotDefinitions.map((slot) => (
            <div key={slot.key}>
              <dt>{slot.label}</dt>
              <dd>{assetDetails(state.outfitSlots[slot.key])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="debug-section">
        <h3>Scene</h3>
        <dl className="debug-list">
          <div>
            <dt>Preset</dt>
            <dd>{state.scene.preset}</dd>
          </div>
          <div>
            <dt>Scene reference filename</dt>
            <dd>{assetLabel(state.scene.reference)}</dd>
          </div>
          <div>
            <dt>Scene reference asset</dt>
            <dd>{assetDetails(state.scene.reference)}</dd>
          </div>
          <div>
            <dt>Custom prompt</dt>
            <dd>{state.scene.customPrompt || "Empty"}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Composition</h3>
        <dl className="debug-list">
          <div>
            <dt>Composition</dt>
            <dd>{state.composition.preset}</dd>
          </div>
          <div>
            <dt>Graphic Overlay</dt>
            <dd>{state.composition.graphic}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Look / Light</h3>
        <p>{state.look}</p>
      </div>

      <div className="debug-section">
        <h3>Output</h3>
        <dl className="debug-list">
          <div>
            <dt>Selected Provider</dt>
            <dd>{`${generationConfig.provider.label} (${generationConfig.provider.mode})`}</dd>
          </div>
          <div>
            <dt>Aspect Ratio</dt>
            <dd>{state.output.aspectRatio}</dd>
          </div>
          <div>
            <dt>Count</dt>
            <dd>{state.output.count}</dd>
          </div>
          <div>
            <dt>Quality</dt>
            <dd>{state.output.quality}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{state.output.mode}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Resolved Generation Config</h3>
        <dl className="debug-list">
          <div>
            <dt>Generation Provider</dt>
            <dd>{`${generationConfig.provider.label} | ${generationConfig.provider.mode} | ${generationConfig.provider.description}`}</dd>
          </div>
          <div>
            <dt>Content Type</dt>
            <dd>{generationConfig.contentType.label}</dd>
          </div>
          <div>
            <dt>Product Fidelity</dt>
            <dd>{generationConfig.productFidelity ? "ON" : "OFF"}</dd>
          </div>
          <div>
            <dt>Products</dt>
            <dd>{generationConfig.products.length ? `${generationConfig.products.length} stored asset(s)` : "None"}</dd>
          </div>
          <div>
            <dt>Product assets</dt>
            <dd>
              {generationConfig.products.length
                ? generationConfig.products
                    .map(
                      (product) =>
                        `${product.slot.label}: ${product.assetType} | ${product.assetId} | ${product.originalFileName} | ${product.mimeType} | ${product.width}x${product.height} | ${formatBytes(product.sizeBytes)}`
                    )
                    .join(" | ")
                : "None"}
            </dd>
          </div>
          <div>
            <dt>Scene Reference</dt>
            <dd>{assetDetails(generationConfig.scene.reference)}</dd>
          </div>
          <div>
            <dt>Scene</dt>
            <dd>{`${generationConfig.scene.id} ${generationConfig.scene.name}`}</dd>
          </div>
          <div>
            <dt>Composition</dt>
            <dd>{`${generationConfig.composition.id} ${generationConfig.composition.name}`}</dd>
          </div>
          <div>
            <dt>Graphic</dt>
            <dd>{`${generationConfig.graphic.id} ${generationConfig.graphic.name}`}</dd>
          </div>
          <div>
            <dt>Look</dt>
            <dd>{`${generationConfig.look.id} ${generationConfig.look.name}`}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{`${generationConfig.output.aspectRatio.label}, ${generationConfig.output.count.label}, ${generationConfig.output.quality.label}, ${generationConfig.output.mode.label}`}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Compiled Generation Plan</h3>
        <dl className="debug-list">
          <div>
            <dt>Summary</dt>
            <dd>{generationPlan.summary}</dd>
          </div>
          <div>
            <dt>Task Type</dt>
            <dd>{generationPlan.taskType}</dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{generationPlan.warnings.length ? generationPlan.warnings.join(" | ") : "None"}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Prompt QA</h3>
        <dl className="debug-list">
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`qa-badge qa-badge-${promptQA.status}`}>{promptQA.status.toUpperCase()}</span>
            </dd>
          </div>
          <div>
            <dt>Metrics</dt>
            <dd>{`${promptQA.metrics.promptLength} chars | ${promptQA.metrics.sectionCount} sections | ${promptQA.metrics.warningCount} warnings | ${promptQA.metrics.errorCount} errors`}</dd>
          </div>
          <div>
            <dt>Issues</dt>
            <dd>
              {promptQA.issues.length
                ? promptQA.issues
                    .map((item) => `${item.severity.toUpperCase()} ${item.code}: ${item.message}`)
                    .join(" | ")
                : "None"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>AI Assistance</h3>
        <dl className="debug-list">
          <div>
            <dt>Available</dt>
            <dd>{aiAvailable === null ? "Unknown" : aiAvailable ? "Available" : "Unavailable"}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{aiModel ?? "Not requested"}</dd>
          </div>
          <div>
            <dt>Credential Source</dt>
            <dd>{aiCredentialSource ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Last Operation</dt>
            <dd>{aiLastOperation ?? "None"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{aiStatus}</dd>
          </div>
          <div>
            <dt>Summary</dt>
            <dd>{aiSummary}</dd>
          </div>
          <div>
            <dt>Refinement</dt>
            <dd>{aiRefinement ? aiRefinement.refinedScenePrompt : "None"}</dd>
          </div>
          <div>
            <dt>Analysis</dt>
            <dd>{aiAnalysis ? `${aiAnalysis.environment.type}; ${aiAnalysis.mood}` : "None"}</dd>
          </div>
        </dl>
      </div>

      <div className="debug-section">
        <h3>Manual Provider</h3>
        <dl className="debug-list">
          <div>
            <dt>Package Status</dt>
            <dd>{manualPackage ? manualPackage.status : "None"}</dd>
          </div>
          <div>
            <dt>Reference Count</dt>
            <dd>
              {manualPackage
                ? manualPackage.referenceAssets.length + (manualPackage.sceneReference ? 1 : 0)
                : 0}
            </dd>
          </div>
        </dl>
      </div>

      <details className="raw-state" open>
        <summary>Final Prompt</summary>
        <pre>{generationPlan.finalPrompt}</pre>
      </details>

      <details className="raw-state" open>
        <summary>Prompt Fragments</summary>
        <dl className="debug-list prompt-fragment-list">
          {Object.entries(generationConfig.promptFragments).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value || "None"}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="raw-state">
        <summary>Raw State</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>

      <details className="raw-state">
        <summary>Raw Generation Config</summary>
        <pre>{JSON.stringify(generationConfig, null, 2)}</pre>
      </details>

      <details className="raw-state">
        <summary>Raw GenerationPlan</summary>
        <pre>{JSON.stringify(generationPlan, null, 2)}</pre>
      </details>

      <details className="raw-state">
        <summary>Raw Prompt QA</summary>
        <pre>{JSON.stringify(promptQA, null, 2)}</pre>
      </details>

      <details className="raw-state">
        <summary>Raw AI Assistance</summary>
        <pre>{JSON.stringify({ aiRefinement, aiAnalysis }, null, 2)}</pre>
      </details>
    </aside>
  );
}

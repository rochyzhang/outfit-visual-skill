"use client";

import Image from "next/image";
import { useId, useState, type ChangeEvent } from "react";
import { PresetCard } from "@/components/workflow/preset-card";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { formatBytes } from "@/config/assets";
import { scenePresets } from "@/config/presets/scenes";
import { analyzeSceneReference, refineScenePrompt } from "@/features/ai/ai-client";
import type { SceneReferenceAnalysisResult, SceneRefinementResult } from "@/features/ai/ai-schemas";
import { isSupportedImage } from "@/features/outfit/outfit-slot";
import { uploadAsset } from "@/lib/assets/upload-asset";
import { useAiAssistanceStore } from "@/stores/ai-assistance-store";
import { useWorkflowStore } from "@/stores/workflow-store";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type RefineStatus = "idle" | "refining" | "success" | "error";
type AnalyzeStatus = "idle" | "analyzing" | "success" | "error";

export function SceneModule() {
  const contentType = useWorkflowStore((state) => state.contentType);
  const preset = useWorkflowStore((state) => state.scene.preset);
  const reference = useWorkflowStore((state) => state.scene.reference);
  const customPrompt = useWorkflowStore((state) => state.scene.customPrompt);
  const setScenePreset = useWorkflowStore((state) => state.setScenePreset);
  const setSceneReferenceAsset = useWorkflowStore((state) => state.setSceneReferenceAsset);
  const removeSceneReferenceAsset = useWorkflowStore((state) => state.removeSceneReferenceAsset);
  const setSceneCustomPrompt = useWorkflowStore((state) => state.setSceneCustomPrompt);
  const setAiRunning = useAiAssistanceStore((state) => state.setRunning);
  const setAiSuccess = useAiAssistanceStore((state) => state.setSuccess);
  const setAiError = useAiAssistanceStore((state) => state.setError);
  const inputId = useId();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [refineStatus, setRefineStatus] = useState<RefineStatus>("idle");
  const [refineError, setRefineError] = useState("");
  const [refinement, setRefinement] = useState<SceneRefinementResult | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>("idle");
  const [analysisError, setAnalysisError] = useState("");
  const [analysis, setAnalysis] = useState<SceneReferenceAnalysisResult | null>(null);

  async function handleReferenceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isSupportedImage(file)) {
      setError("Use JPEG, PNG, or WebP.");
      return;
    }

    setError("");
    setStatus("uploading");

    try {
      const uploadedAsset = await uploadAsset(file, "scene_reference");
      setSceneReferenceAsset(uploadedAsset);
      setStatus("success");
      setAnalysis(null);
      setAnalysisError("");
      setAnalyzeStatus("idle");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function handleRefineScene() {
    setRefineError("");
    setRefinement(null);

    if (!customPrompt.trim()) {
      const message = "Enter custom scene text before refining.";
      setRefineError(message);
      setRefineStatus("error");
      setAiError({ operation: "refine-scene", message });
      return;
    }

    setRefineStatus("refining");
    setAiRunning("refine-scene");

    try {
      const response = await refineScenePrompt({ customPrompt, contentType });
      setRefinement(response.result);
      setRefineStatus("success");
      setAiSuccess({
        operation: "refine-scene",
        model: response.ai.model,
        source: response.ai.source,
        result: response.result,
        summary: response.result.refinedScenePrompt
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "AI refinement failed.";
      setRefineError(message);
      setRefineStatus("error");
      setAiError({ operation: "refine-scene", message });
    }
  }

  async function handleAnalyzeReference() {
    if (!reference) {
      return;
    }

    setAnalysisError("");
    setAnalysis(null);
    setAnalyzeStatus("analyzing");
    setAiRunning("analyze-scene-reference");

    try {
      const response = await analyzeSceneReference(reference.id);
      setAnalysis(response.result);
      setAnalyzeStatus("success");
      setAiSuccess({
        operation: "analyze-scene-reference",
        model: response.ai.model,
        source: response.ai.source,
        result: response.result,
        summary: `${response.result.environment.type}; ${response.result.mood}`
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "AI analysis failed.";
      setAnalysisError(message);
      setAnalyzeStatus("error");
      setAiError({ operation: "analyze-scene-reference", message });
    }
  }

  function useRefinedPrompt() {
    if (refinement) {
      setSceneCustomPrompt(refinement.refinedScenePrompt);
    }
  }

  function useSceneSuggestion() {
    if (analysis) {
      setSceneCustomPrompt(analysis.scenePromptSuggestion);
      setScenePreset("S06");
    }
  }

  async function copyLookSuggestions() {
    if (!analysis) {
      return;
    }

    const look = analysis.lookSuggestions;
    await navigator.clipboard.writeText(
      [
        `Lighting: ${look.lighting}`,
        `Color: ${look.color}`,
        `Contrast: ${look.contrast}`,
        `Texture: ${look.texture}`,
        `Mood: ${look.mood}`
      ].join("\n")
    );
  }

  return (
    <WorkflowModule number="02" title="SCENE" description="Choose the environment.">
      <div className="control-group">
        <div className="section-label">Presets</div>
        <div className="preset-stack">
          {scenePresets.map((option) => (
            <PresetCard
              key={option.id}
              id={option.id}
              name={option.name}
              description={option.shortDescription}
              selected={preset === option.id}
              onSelect={() => setScenePreset(option.id)}
              testId={`scene-preset-${option.id}`}
              visual={option.visual}
            />
          ))}
        </div>
      </div>

      <div className="control-group">
        <div className="section-label">Scene Reference</div>
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          data-testid="scene-reference-input"
          onChange={handleReferenceChange}
        />
        {reference ? (
          <div className="reference-card loaded">
            <label className="reference-preview-action" htmlFor={inputId} aria-label="Replace scene reference image">
              <Image src={reference.publicUrl} alt="Scene reference preview" width={280} height={175} unoptimized />
            </label>
            <div>
              <strong>{reference.originalFileName}</strong>
              <span>{`${reference.mimeType} | ${reference.width}x${reference.height} | ${formatBytes(reference.sizeBytes)}`}</span>
            </div>
            <div className="reference-actions">
              <label className="text-button" htmlFor={status === "uploading" ? undefined : inputId} aria-disabled={status === "uploading"}>
                {status === "uploading" ? "Uploading" : "Replace"}
              </label>
              <button
                className="text-button danger"
                type="button"
                disabled={status === "uploading"}
                onClick={removeSceneReferenceAsset}
              >
                Remove
              </button>
            </div>
            {status === "success" ? <p className="field-status">Stored asset preview</p> : null}
            <button
              className="secondary-button"
              type="button"
              disabled={analyzeStatus === "analyzing"}
              onClick={handleAnalyzeReference}
            >
              {analyzeStatus === "analyzing" ? "Analyzing" : "Analyze Reference"}
            </button>
            {analysisError ? <p className="field-error">{analysisError}</p> : null}
            {analysis ? (
              <SceneReferenceAnalysisPanel
                analysis={analysis}
                onUseSceneSuggestion={useSceneSuggestion}
                onCopyLookSuggestions={copyLookSuggestions}
              />
            ) : null}
          </div>
        ) : (
          <label className="reference-empty" htmlFor={inputId}>
            {status === "uploading" ? "Uploading scene image" : "Upload scene image"}
          </label>
        )}
        {error ? <p className="field-error">{error}</p> : null}
      </div>

      <label className="control-group">
        <span className="section-label">Custom Prompt</span>
        <textarea
          className="prompt-textarea"
          value={customPrompt}
          placeholder="Describe the background, environment or atmosphere..."
          onChange={(event) => setSceneCustomPrompt(event.target.value)}
        />
      </label>
      {preset === "S06" ? (
        <div className="ai-assist-block">
          <div className="ai-assist-actions">
            <button className="secondary-button" type="button" disabled={refineStatus === "refining"} onClick={handleRefineScene}>
              {refineStatus === "refining" ? "Refining" : "Refine with GPT"}
            </button>
            <span className="ai-assist-status">{refineStatus}</span>
          </div>
          {refineError ? <p className="field-error">{refineError}</p> : null}
          {refinement ? <SceneRefinementPanel originalPrompt={customPrompt} refinement={refinement} onUse={useRefinedPrompt} /> : null}
        </div>
      ) : null}
    </WorkflowModule>
  );
}

interface SceneRefinementPanelProps {
  originalPrompt: string;
  refinement: SceneRefinementResult;
  onUse: () => void;
}

function SceneRefinementPanel({ originalPrompt, refinement, onUse }: SceneRefinementPanelProps) {
  return (
    <div className="ai-result-panel">
      <div>
        <span className="section-label">Original Scene Text</span>
        <p>{originalPrompt || "Empty"}</p>
      </div>
      <div>
        <span className="section-label">Refined Scene Prompt</span>
        <p>{refinement.refinedScenePrompt}</p>
      </div>
      <dl className="ai-result-list">
        <div>
          <dt>Environment</dt>
          <dd>{refinement.environment}</dd>
        </div>
        <div>
          <dt>Background</dt>
          <dd>{refinement.background}</dd>
        </div>
        <div>
          <dt>Surface</dt>
          <dd>{refinement.surface}</dd>
        </div>
        <div>
          <dt>Mood</dt>
          <dd>{refinement.desiredMood}</dd>
        </div>
      </dl>
      {refinement.warnings.length ? <p className="field-status">{refinement.warnings.join(" | ")}</p> : null}
      <button className="secondary-button" type="button" onClick={onUse}>
        Use Refined Prompt
      </button>
    </div>
  );
}

interface SceneReferenceAnalysisPanelProps {
  analysis: SceneReferenceAnalysisResult;
  onUseSceneSuggestion: () => void;
  onCopyLookSuggestions: () => void;
}

function SceneReferenceAnalysisPanel({
  analysis,
  onUseSceneSuggestion,
  onCopyLookSuggestions
}: SceneReferenceAnalysisPanelProps) {
  return (
    <div className="ai-result-panel">
      <dl className="ai-result-list">
        <div>
          <dt>Environment</dt>
          <dd>{`${analysis.environment.type}; ${analysis.environment.background}; ${analysis.environment.surface}`}</dd>
        </div>
        <div>
          <dt>Lighting</dt>
          <dd>{`${analysis.lighting.direction}, ${analysis.lighting.softness}, ${analysis.lighting.intensity}`}</dd>
        </div>
        <div>
          <dt>Palette</dt>
          <dd>{analysis.color.dominantPalette.join(", ") || "Not detected"}</dd>
        </div>
        <div>
          <dt>Mood</dt>
          <dd>{analysis.mood}</dd>
        </div>
      </dl>
      <details className="ai-full-analysis">
        <summary>Full Analysis</summary>
        <dl className="ai-result-list">
          <div>
            <dt>Spatial Context</dt>
            <dd>{analysis.environment.spatialContext}</dd>
          </div>
          <div>
            <dt>Props</dt>
            <dd>{analysis.environment.visibleProps.join(", ") || "None"}</dd>
          </div>
          <div>
            <dt>Color</dt>
            <dd>{`${analysis.color.saturation}; ${analysis.color.temperature}`}</dd>
          </div>
          <div>
            <dt>Texture</dt>
            <dd>{`${analysis.texture.backgroundTexture}; ${analysis.texture.photographicTexture}`}</dd>
          </div>
          <div>
            <dt>Composition Notes</dt>
            <dd>{analysis.compositionNotes.join(" | ") || "None"}</dd>
          </div>
          <div>
            <dt>Scene Suggestion</dt>
            <dd>{analysis.scenePromptSuggestion}</dd>
          </div>
          <div>
            <dt>Look Suggestions</dt>
            <dd>
              {[
                analysis.lookSuggestions.lighting,
                analysis.lookSuggestions.color,
                analysis.lookSuggestions.contrast,
                analysis.lookSuggestions.texture,
                analysis.lookSuggestions.mood
              ].join(" | ")}
            </dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{analysis.warnings.join(" | ") || "None"}</dd>
          </div>
        </dl>
      </details>
      <div className="ai-assist-actions">
        <button className="secondary-button" type="button" onClick={onUseSceneSuggestion}>
          Use Scene Suggestion
        </button>
        <button className="text-button" type="button" onClick={onCopyLookSuggestions}>
          Copy Look Suggestions
        </button>
      </div>
    </div>
  );
}

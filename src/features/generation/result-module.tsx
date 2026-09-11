"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { aspectRatioOptions, qualityOptions } from "@/config/output-options";
import { getWorkflowSkill, isWorkflowSkillId, type WorkflowSkillId } from "@/config/skills";
import { compositionPresets } from "@/config/presets/compositions";
import { lookPresets } from "@/config/presets/looks";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useManualGenerationStore } from "@/stores/manual-generation-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { GenerationResultState } from "@/stores/generation-result-store";
import type { GenerationProviderId } from "@/config/generation-providers";
import type { AspectRatio, CompositionPresetId, LookPresetId, OutputQuality } from "@/types/domain";

function compositionLabel(id: GenerationResultState["compositionId"]) {
  return id ? compositionPresets.find((preset) => preset.id === id)?.name ?? id : "Not generated";
}

function lookLabel(id: GenerationResultState["lookId"]) {
  return id ? lookPresets.find((preset) => preset.id === id)?.name ?? id : "Not generated";
}

function aspectRatioLabel(value: GenerationResultState["aspectRatio"]) {
  return value ? aspectRatioOptions.find((option) => option.value === value)?.label ?? value : "Not generated";
}

function qualityLabel(value: GenerationResultState["quality"]) {
  return value ? qualityOptions.find((option) => option.value === value)?.label ?? value : "Not generated";
}

function providerLabel(providerId: GenerationProviderId | undefined) {
  switch (providerId) {
    case "chatgpt_manual":
      return "ChatGPT Manual";
    case "gemini":
      return "Gemini";
    case "openai":
      return "OpenAI";
    default:
      return "Not generated";
  }
}

function skillLabel(skillId: WorkflowSkillId | null | undefined, skillName: string | null | undefined) {
  if (skillName) {
    return skillName;
  }

  if (isWorkflowSkillId(skillId)) {
    return getWorkflowSkill(skillId).name;
  }

  return "Custom Workflow";
}

interface ImportedGeneratedResult {
  id: string;
  generationId: string;
  skillId: WorkflowSkillId | null;
  skillName: string | null;
  imageId: string;
  publicUrl: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  width: number;
  height: number;
}

interface ImportResultSuccess {
  result: ImportedGeneratedResult;
}

interface ImportResultFailure {
  error: {
    message: string;
  };
}

function isImportFailure(value: unknown): value is ImportResultFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function isImportSuccess(value: unknown): value is ImportResultSuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    "result" in value &&
    typeof (value as { result?: { publicUrl?: unknown } }).result?.publicUrl === "string"
  );
}

interface GenerationHistoryImage {
  id: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
}

interface GenerationHistoryItem {
  id: string;
  parentGenerationId: string | null;
  skillId: WorkflowSkillId | null;
  skillName: string | null;
  revisionType: "scene" | "composition" | "look" | "pose" | "product" | "output" | "prompt" | "mixed" | "retry" | null;
  revisionInstruction: string | null;
  providerId: GenerationProviderId;
  providerMode: "manual" | "api";
  model: string | null;
  status: "generating" | "success" | "error";
  generationType: "automatic" | "manual_import";
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  compositionId: CompositionPresetId;
  lookId: LookPresetId;
  aspectRatio: AspectRatio;
  quality: OutputQuality;
  image: GenerationHistoryImage | null;
}

type RevisionScope = "scene" | "composition" | "look" | "pose" | "product" | "output" | "prompt";

const dismissedHistoryStorageKey = "outfit-visual-studio.dismissed-generation-history";

function readDismissedHistoryIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(dismissedHistoryStorageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeDismissedHistoryIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(dismissedHistoryStorageKey, JSON.stringify([...ids]));
  } catch {
    // History dismissal is a UI preference; storage failure should not block hiding the row.
  }
}

interface GenerationHistorySuccess {
  generations: GenerationHistoryItem[];
}

function isHistorySuccess(value: unknown): value is GenerationHistorySuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { generations?: unknown }).generations)
  );
}

function historyResultInput(item: GenerationHistoryItem) {
  const image = item.image;

  if (!image) {
    return null;
  }

  return {
    generationId: item.id,
    skillId: item.skillId,
    skillName: skillLabel(item.skillId, item.skillName),
    imageId: image.id,
    imageUrl: image.publicUrl,
    providerId: item.providerId,
    model: item.model ?? undefined,
    originalFileName: image.fileName,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    durationMs: item.durationMs ?? undefined,
    aspectRatio: item.aspectRatio,
    quality: item.quality,
    compositionId: item.compositionId,
    lookId: item.lookId
  };
}

export function ResultModule() {
  const contentType = useWorkflowStore((state) => state.contentType);
  const selectedSkillId = useWorkflowStore((state) => state.selectedSkillId);
  const productFidelity = useWorkflowStore((state) => state.productFidelity);
  const outfitSlots = useWorkflowStore((state) => state.outfitSlots);
  const scene = useWorkflowStore((state) => state.scene);
  const output = useWorkflowStore((state) => state.output);
  const composition = useWorkflowStore((state) => state.composition);
  const look = useWorkflowStore((state) => state.look);
  const status = useGenerationResultStore((state) => state.status);
  const generationId = useGenerationResultStore((state) => state.generationId);
  const skillId = useGenerationResultStore((state) => state.skillId);
  const skillName = useGenerationResultStore((state) => state.skillName);
  const imageId = useGenerationResultStore((state) => state.imageId);
  const imageUrl = useGenerationResultStore((state) => state.imageUrl);
  const aspectRatio = useGenerationResultStore((state) => state.aspectRatio);
  const quality = useGenerationResultStore((state) => state.quality);
  const providerId = useGenerationResultStore((state) => state.providerId);
  const model = useGenerationResultStore((state) => state.model);
  const originalFileName = useGenerationResultStore((state) => state.originalFileName);
  const mimeType = useGenerationResultStore((state) => state.mimeType);
  const width = useGenerationResultStore((state) => state.width);
  const height = useGenerationResultStore((state) => state.height);
  const durationMs = useGenerationResultStore((state) => state.durationMs);
  const compositionId = useGenerationResultStore((state) => state.compositionId);
  const lookId = useGenerationResultStore((state) => state.lookId);
  const errorCode = useGenerationResultStore((state) => state.errorCode);
  const errorMessage = useGenerationResultStore((state) => state.errorMessage);
  const previousSuccess = useGenerationResultStore((state) => state.previousSuccess);
  const setQueued = useGenerationResultStore((state) => state.setQueued);
  const setGenerating = useGenerationResultStore((state) => state.setGenerating);
  const setSuccess = useGenerationResultStore((state) => state.setSuccess);
  const setError = useGenerationResultStore((state) => state.setError);
  const resetResult = useGenerationResultStore((state) => state.resetResult);
  const openManualPackage = useManualGenerationStore((state) => state.openPackage);
  const manualPackage = useManualGenerationStore((state) => state.package);
  const result: GenerationResultState = {
    status,
    generationId,
    skillId,
    skillName,
    imageId,
    imageUrl,
    providerId,
    model,
    originalFileName,
    mimeType,
    width,
    height,
    durationMs,
    aspectRatio,
    quality,
    compositionId,
    lookId,
    errorCode,
    errorMessage,
    previousSuccess
  };
  const [viewerOpen, setViewerOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "importing">("idle");
  const [historyStatus, setHistoryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [, setDismissedHistoryIds] = useState<Set<string>>(() => new Set());
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [revisionParent, setRevisionParent] = useState<GenerationHistoryItem | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<"idle" | "submitting">("idle");
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultModuleRef = useRef<HTMLDivElement | null>(null);
  const canOpenViewer = Boolean(result.imageUrl ?? result.previousSuccess?.imageUrl);
  const manualProviderActive = output.providerId === "chatgpt_manual";
  const latestSuccessId = historyItems.find((item) => item.status === "success" && item.image)?.id ?? null;
  const displayedGenerationId = result.generationId ?? selectedHistoryId;
  const viewingHistorical = Boolean(displayedGenerationId && latestSuccessId && displayedGenerationId !== latestSuccessId);

  const loadHistory = useCallback(async () => {
    setHistoryStatus("loading");
    setHistoryError(null);

    try {
      const response = await fetch("/api/projects/current/generations?limit=20");
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok || !isHistorySuccess(payload)) {
        throw new Error("Could not load generation history.");
      }

      const dismissedIds = readDismissedHistoryIds();
      const visibleGenerations = payload.generations.filter((item) => !dismissedIds.has(item.id));
      setDismissedHistoryIds(dismissedIds);
      setHistoryItems(visibleGenerations);
      setHistoryStatus("ready");

      const latestSuccess = visibleGenerations.find((item) => item.status === "success" && item.image);
      const latestResult = latestSuccess ? historyResultInput(latestSuccess) : null;
      if (latestResult && useGenerationResultStore.getState().status === "empty") {
        setSuccess(latestResult);
        setSelectedHistoryId(latestSuccess?.id ?? null);
      }
    } catch (error) {
      setHistoryStatus("error");
      setHistoryError(error instanceof Error ? error.message : "Could not load generation history.");
    }
  }, [setSuccess]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadHistory();
    });
  }, [loadHistory]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      queueMicrotask(() => {
        void loadHistory();
      });
    }
  }, [generationId, loadHistory, status]);

  async function handleImportResult(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportStatus("importing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("providerId", "chatgpt_manual");
      if (manualPackage?.revision) {
        formData.append("parentGenerationId", manualPackage.revision.parentGenerationId);
        formData.append("revisionType", manualPackage.revision.revisionType);
        formData.append("revisionInstruction", manualPackage.revision.revisionInstruction);
      }
      const importWorkflowSnapshot = manualPackage?.workflowSnapshot ?? workflowDraftToSnapshot({
        contentType,
        selectedSkillId,
        productFidelity,
        outfitSlots,
        scene,
        composition,
        look,
        output
      });
      formData.append("workflowSnapshot", JSON.stringify(importWorkflowSnapshot));
      formData.append("aspectRatio", output.aspectRatio);
      formData.append("quality", output.quality);
      formData.append("compositionId", composition.preset);
      formData.append("lookId", look);

      const response = await fetch("/api/results/import", {
        method: "POST",
        body: formData
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(isImportFailure(payload) ? payload.error.message : "Could not import result.");
      }

      if (!isImportSuccess(payload)) {
        throw new Error("Import response was invalid.");
      }

      setSuccess({
        generationId: payload.result.generationId,
        skillId: payload.result.skillId,
        skillName: skillLabel(payload.result.skillId, payload.result.skillName),
        imageId: payload.result.imageId,
        imageUrl: payload.result.publicUrl,
        providerId: "chatgpt_manual",
        model: undefined,
        originalFileName: payload.result.originalFileName,
        mimeType: payload.result.mimeType,
        width: payload.result.width,
        height: payload.result.height,
        durationMs: 0,
        aspectRatio: output.aspectRatio,
        quality: output.quality,
        compositionId: composition.preset,
        lookId: look
      });
      window.requestAnimationFrame(() => {
        resultModuleRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
      setSelectedHistoryId(payload.result.generationId);
      void loadHistory();
    } catch (error) {
      setError({
        generationId: crypto.randomUUID(),
        providerId: "chatgpt_manual",
        aspectRatio: output.aspectRatio,
        quality: output.quality,
        compositionId: composition.preset,
        lookId: look,
        errorCode: "MANUAL_RESULT_IMPORT_FAILED",
        errorMessage: error instanceof Error ? error.message : "Could not import result."
      });
    } finally {
      setImportStatus("idle");
      event.target.value = "";
    }
  }

  return (
    <WorkflowModule number="06" title="RESULT" description="Generated output." variant="result">
      <div ref={resultModuleRef} className="result-module-shell" id="generation-result-module" data-testid="result-module">
        <ResultPreview result={result} manualProviderActive={manualProviderActive} onOpenViewer={() => setViewerOpen(true)} />
        <ResultDetails
          result={result}
          manualProviderActive={manualProviderActive}
          viewingHistorical={viewingHistorical}
          importStatus={importStatus}
          onCreateRevision={() => {
            const parent = historyItems.find((item) => item.id === result.generationId);
            if (parent?.status === "success") {
              setRevisionParent(parent);
            }
          }}
          onImportClick={() => fileInputRef.current?.click()}
          onClear={resetResult}
        />
        <GenerationHistory
          items={historyItems}
          status={historyStatus}
          errorMessage={historyError}
          selectedId={displayedGenerationId ?? null}
          onCreateRevision={(item) => setRevisionParent(item)}
          onRetry={(item) => {
            void retryHistoryItem(item);
          }}
          onDismiss={(item) => {
            setHistoryItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
            setDismissedHistoryIds((current) => {
              const next = new Set(current);
              next.add(item.id);
              writeDismissedHistoryIds(next);
              return next;
            });
            if (selectedHistoryId === item.id) {
              setSelectedHistoryId(null);
            }
          }}
          onSelect={(item) => {
            setSelectedHistoryId(item.id);
            const selectedResult = historyResultInput(item);

            if (selectedResult) {
              setSuccess(selectedResult);
              return;
            }

            setError({
              generationId: item.id,
              skillId: item.skillId,
              skillName: skillLabel(item.skillId, item.skillName),
              providerId: item.providerId,
              aspectRatio: item.aspectRatio,
              quality: item.quality,
              compositionId: item.compositionId,
              lookId: item.lookId,
              errorCode: item.errorCode ?? "GENERATION_FAILED",
              errorMessage: item.errorMessage ?? "Generation failed."
            });
          }}
        />
        {revisionParent ? (
          <RevisionPanel
            parent={revisionParent}
            status={revisionStatus}
            errorMessage={revisionError}
            onCancel={() => {
              setRevisionParent(null);
              setRevisionError(null);
            }}
            onSubmit={(input) => {
              void submitRevision(revisionParent, input);
            }}
          />
        ) : null}
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImportResult}
        />
      </div>
      {canOpenViewer && viewerOpen ? <GenerationImageViewer result={result} onClose={() => setViewerOpen(false)} /> : null}
    </WorkflowModule>
  );

  async function submitRevision(parent: GenerationHistoryItem, input: { revisionTypes: RevisionScope[]; revisionInstruction: string }) {
    const localGenerationId = crypto.randomUUID();
    setRevisionStatus("submitting");
    setRevisionError(null);
    setQueued({
      generationId: localGenerationId,
      skillId: parent.skillId,
      skillName: skillLabel(parent.skillId, parent.skillName),
      providerId: parent.providerId,
      aspectRatio: parent.aspectRatio,
      quality: parent.quality,
      compositionId: parent.compositionId,
      lookId: parent.lookId
    });
    setGenerating({
      generationId: localGenerationId,
      skillId: parent.skillId,
      skillName: skillLabel(parent.skillId, parent.skillName),
      providerId: parent.providerId,
      aspectRatio: parent.aspectRatio,
      quality: parent.quality,
      compositionId: parent.compositionId,
      lookId: parent.lookId
    });

    try {
      const response = await fetch(`/api/generations/${parent.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            mode?: "automatic" | "manual";
            result?: {
              generationId?: string;
              providerId?: GenerationProviderId;
              model?: string;
              durationMs?: number;
              images?: Array<GenerationHistoryImage & { imageUrl?: string }>;
              source?: {
                aspectRatio: GenerationHistoryItem["aspectRatio"];
                quality: GenerationHistoryItem["quality"];
                skillOrigin: {
                  id: WorkflowSkillId;
                  name: string;
                } | null;
                compositionId: GenerationHistoryItem["compositionId"];
                lookId: GenerationHistoryItem["lookId"];
              };
            };
            manualPackage?: Parameters<typeof openManualPackage>[0];
            error?: { code?: string; message?: string };
          }
        | null;

      if (!response.ok) {
        const error = payload && "error" in payload ? payload.error : null;
        throw new Error(error?.message ?? "Could not create revision.");
      }

      if (payload?.mode === "automatic" && payload.result?.images?.[0] && payload.result.source) {
        const image = payload.result.images[0];
        setSuccess({
          generationId: payload.result.generationId ?? localGenerationId,
          skillId: payload.result.source.skillOrigin?.id ?? null,
          skillName: skillLabel(payload.result.source.skillOrigin?.id, payload.result.source.skillOrigin?.name),
          imageId: image.id,
          imageUrl: image.imageUrl ?? image.publicUrl,
          providerId: payload.result.providerId,
          model: payload.result.model,
          originalFileName: image.fileName,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          durationMs: payload.result.durationMs,
          aspectRatio: payload.result.source.aspectRatio,
          quality: payload.result.source.quality,
          compositionId: payload.result.source.compositionId,
          lookId: payload.result.source.lookId
        });
        setRevisionParent(null);
        await loadHistory();
        return;
      }

      if (payload && "manualPackage" in payload && payload.manualPackage) {
        openManualPackage(payload.manualPackage);
        setRevisionParent(null);
        resetResult();
        await loadHistory();
        return;
      }

      throw new Error("Revision response was invalid.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create revision.";
      setRevisionError(message);
      setError({
        generationId: localGenerationId,
        skillId: parent.skillId,
        skillName: skillLabel(parent.skillId, parent.skillName),
        providerId: parent.providerId,
        aspectRatio: parent.aspectRatio,
        quality: parent.quality,
        compositionId: parent.compositionId,
        lookId: parent.lookId,
        errorCode: "REVISION_REQUEST_FAILED",
        errorMessage: message
      });
    } finally {
      setRevisionStatus("idle");
    }
  }

  async function retryHistoryItem(parent: GenerationHistoryItem) {
    const localGenerationId = crypto.randomUUID();
    setQueued({
      generationId: localGenerationId,
      skillId: parent.skillId,
      skillName: skillLabel(parent.skillId, parent.skillName),
      providerId: parent.providerId,
      aspectRatio: parent.aspectRatio,
      quality: parent.quality,
      compositionId: parent.compositionId,
      lookId: parent.lookId
    });
    setGenerating({
      generationId: localGenerationId,
      skillId: parent.skillId,
      skillName: skillLabel(parent.skillId, parent.skillName),
      providerId: parent.providerId,
      aspectRatio: parent.aspectRatio,
      quality: parent.quality,
      compositionId: parent.compositionId,
      lookId: parent.lookId
    });

    try {
      const response = await fetch(`/api/generations/${parent.id}/retry`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | {
            result?: {
              generationId?: string;
              providerId?: GenerationProviderId;
              model?: string;
              durationMs?: number;
              images?: Array<GenerationHistoryImage & { imageUrl?: string }>;
              source?: {
                aspectRatio: GenerationHistoryItem["aspectRatio"];
                quality: GenerationHistoryItem["quality"];
                skillOrigin: {
                  id: WorkflowSkillId;
                  name: string;
                } | null;
                compositionId: GenerationHistoryItem["compositionId"];
                lookId: GenerationHistoryItem["lookId"];
              };
            };
            error?: { message?: string };
          }
        | null;

      if (!response.ok) {
        const error = payload && "error" in payload ? payload.error : null;
        throw new Error(error?.message ?? "Could not retry generation.");
      }

      if (!payload?.result?.images?.[0] || !payload.result.source) {
        throw new Error("Retry response was invalid.");
      }

      const image = payload.result.images[0];
      setSuccess({
        generationId: payload.result.generationId ?? localGenerationId,
        skillId: payload.result.source.skillOrigin?.id ?? null,
        skillName: skillLabel(payload.result.source.skillOrigin?.id, payload.result.source.skillOrigin?.name),
        imageId: image.id,
        imageUrl: image.imageUrl ?? image.publicUrl,
        providerId: payload.result.providerId,
        model: payload.result.model,
        originalFileName: image.fileName,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        durationMs: payload.result.durationMs,
        aspectRatio: payload.result.source.aspectRatio,
        quality: payload.result.source.quality,
        compositionId: payload.result.source.compositionId,
        lookId: payload.result.source.lookId
      });
      await loadHistory();
    } catch (error) {
      setError({
        generationId: localGenerationId,
        skillId: parent.skillId,
        skillName: skillLabel(parent.skillId, parent.skillName),
        providerId: parent.providerId,
        aspectRatio: parent.aspectRatio,
        quality: parent.quality,
        compositionId: parent.compositionId,
        lookId: parent.lookId,
        errorCode: "RETRY_REQUEST_FAILED",
        errorMessage: error instanceof Error ? error.message : "Could not retry generation."
      });
      await loadHistory();
    }
  }
}

interface ResultPreviewProps {
  result: GenerationResultState;
  manualProviderActive: boolean;
  onOpenViewer: () => void;
}

function ResultPreview({ result, manualProviderActive, onOpenViewer }: ResultPreviewProps) {
  if (result.status === "success" && result.imageUrl) {
    return (
      <button className="result-preview result-preview-clickable" type="button" onClick={onOpenViewer}>
        <Image src={result.imageUrl} alt="Generated outfit visual preview" width={720} height={960} unoptimized />
      </button>
    );
  }

  if ((result.status === "queued" || result.status === "generating" || result.status === "error") && result.previousSuccess?.imageUrl) {
    return (
      <div className="result-preview-with-overlay">
        <button className="result-preview result-preview-clickable" type="button" onClick={onOpenViewer}>
          <Image src={result.previousSuccess.imageUrl} alt="Previous generated outfit visual preview" width={720} height={960} unoptimized />
        </button>
        <div className="result-overlay-status" role="status" aria-live="polite">
          {result.status === "error" ? (
            <>
              <strong>{manualProviderActive ? "Import failed." : "New generation failed."}</strong>
              <span>{result.errorMessage || "The last successful image is still available."}</span>
            </>
          ) : (
            <>
              <span className="result-status-dot" aria-hidden="true" />
              <strong>Generating new result...</strong>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`result-preview result-preview-${result.status}`} role="status" aria-live="polite">
      {result.status === "queued" ? (
        <div className="result-status-stack">
          <span className="result-status-dot" aria-hidden="true" />
          <strong>Preparing generation...</strong>
        </div>
      ) : null}
      {result.status === "generating" ? (
        <div className="result-skeleton" aria-label="Generating image">
          <span />
          <strong>Generating image...</strong>
        </div>
      ) : null}
      {result.status === "error" ? (
        <div className="result-status-stack">
          <strong>{manualProviderActive ? "Import failed." : "Generation failed."}</strong>
          <span>{result.errorMessage || "The generation request could not complete."}</span>
        </div>
      ) : null}
      {result.status === "empty" ? (
        <div className="result-empty-copy">
          <strong>{manualProviderActive ? "No result imported yet." : "No image generated yet."}</strong>
          <span>
            {manualProviderActive
              ? "Generate a Manual Package, create the image in ChatGPT, then import the result here."
              : "Configure the workflow and click Generate."}
          </span>
        </div>
      ) : null}
    </div>
  );
}

interface ResultDetailsProps {
  result: GenerationResultState;
  manualProviderActive: boolean;
  viewingHistorical: boolean;
  importStatus: "idle" | "importing";
  onImportClick: () => void;
  onClear: () => void;
  onCreateRevision: () => void;
}

function ResultDetails({ result, manualProviderActive, viewingHistorical, importStatus, onImportClick, onClear, onCreateRevision }: ResultDetailsProps) {
  return (
    <div className="result-details">
      <dl className="result-meta">
        {viewingHistorical ? (
          <div>
            <dt>View</dt>
            <dd>Historical result</dd>
          </div>
        ) : null}
        <div>
          <dt>Provider</dt>
          <dd>{providerLabel(result.providerId)}</dd>
        </div>
        <div>
          <dt>Skill</dt>
          <dd>{skillLabel(result.skillId, result.skillName)}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{result.model ?? "Not generated"}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{result.originalFileName ?? "Not imported"}</dd>
        </div>
        <div>
          <dt>MIME</dt>
          <dd>{result.mimeType ?? result.previousSuccess?.mimeType ?? "Not generated"}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>{result.width && result.height ? `${result.width} x ${result.height}` : result.previousSuccess?.width && result.previousSuccess.height ? `${result.previousSuccess.width} x ${result.previousSuccess.height}` : "Not generated"}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {typeof result.durationMs === "number"
              ? `${Math.round(result.durationMs / 100) / 10}s`
              : typeof result.previousSuccess?.durationMs === "number"
                ? `${Math.round(result.previousSuccess.durationMs / 100) / 10}s`
                : "Not generated"}
          </dd>
        </div>
        <div>
          <dt>Aspect Ratio</dt>
          <dd>{aspectRatioLabel(result.aspectRatio)}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>{qualityLabel(result.quality)}</dd>
        </div>
        <div>
          <dt>Composition</dt>
          <dd>{compositionLabel(result.compositionId)}</dd>
        </div>
        <div>
          <dt>Look</dt>
          <dd>{lookLabel(result.lookId)}</dd>
        </div>
      </dl>
      {result.status === "success" ? (
        <div className="result-actions" aria-label="Result actions">
          {manualProviderActive ? (
            <button className="secondary-button" type="button" disabled={importStatus === "importing"} onClick={onImportClick}>
              {importStatus === "importing" ? "Importing" : "Replace Result"}
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={onClear}>
            Clear Result
          </button>
          <a className="secondary-button" href={result.imageUrl} download={result.originalFileName ?? "manual-result"}>
            Save Image
          </a>
          <button className="secondary-button" type="button" onClick={onCreateRevision}>
            Create Revision
          </button>
        </div>
      ) : null}
      {result.status === "error" ? (
        <div className="result-actions" aria-label="Result retry action">
          {manualProviderActive ? (
            <button className="secondary-button" type="button" disabled={importStatus === "importing"} onClick={onImportClick}>
              {importStatus === "importing" ? "Importing" : "Import Result"}
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={onClear}>
            Clear Result
          </button>
        </div>
      ) : null}
      {result.status === "empty" && manualProviderActive ? (
        <div className="result-actions" aria-label="Manual result import action">
          <button className="secondary-button" type="button" disabled={importStatus === "importing"} onClick={onImportClick}>
            {importStatus === "importing" ? "Importing" : "Import Result"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface GenerationHistoryProps {
  items: GenerationHistoryItem[];
  status: "loading" | "ready" | "error";
  errorMessage: string | null;
  selectedId: string | null;
  onSelect: (item: GenerationHistoryItem) => void;
  onCreateRevision: (item: GenerationHistoryItem) => void;
  onRetry: (item: GenerationHistoryItem) => void;
  onDismiss: (item: GenerationHistoryItem) => void;
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function GenerationHistory({ items, status, errorMessage, selectedId, onSelect, onCreateRevision, onRetry, onDismiss }: GenerationHistoryProps) {
  return (
    <div className="generation-history" aria-label="Generation history">
      <div className="history-header">
        <div className="section-label">HISTORY</div>
        <span>{status === "ready" ? `${items.length} recent` : status}</span>
      </div>
      {status === "loading" ? <p className="history-message">Loading history...</p> : null}
      {status === "error" ? <p className="history-message">{errorMessage ?? "Could not load generation history."}</p> : null}
      {status === "ready" && !items.length ? <p className="history-message">No persisted generations yet.</p> : null}
      {status === "ready" && items.length ? (
        <div className="history-list">
          {items.map((item) => (
            <div
              key={item.id}
              className={selectedId === item.id ? "history-item selected" : "history-item"}
              data-testid={`history-item-${item.id}`}
            >
              <button className="history-main" type="button" onClick={() => onSelect(item)}>
                <span className="history-thumb" aria-hidden="true">
                  {item.image ? <Image src={item.image.publicUrl} alt="" width={48} height={64} unoptimized /> : <span>{item.status}</span>}
                </span>
                <span className="history-copy">
                  <strong>
                    {providerLabel(item.providerId)} / {item.status}
                    {item.revisionType ? ` / ${item.revisionType === "retry" ? "Retry" : "Revision"}` : ""}
                  </strong>
                  <span>
                    {[item.model, compositionLabel(item.compositionId), lookLabel(item.lookId), aspectRatioLabel(item.aspectRatio), qualityLabel(item.quality)]
                      .filter(Boolean)
                      .join(" | ")}
                  </span>
                  <span>Skill: {skillLabel(item.skillId, item.skillName)}</span>
                  <span>{formatHistoryTime(item.createdAt)}</span>
                  {item.status === "error" ? <span>{item.errorMessage ?? item.errorCode ?? "Generation failed."}</span> : null}
                </span>
              </button>
              <span className="history-actions">
                {item.status === "success" ? (
                  <button className="secondary-button" type="button" onClick={() => onCreateRevision(item)}>
                    Create Revision
                  </button>
                ) : null}
                {item.status === "error" && item.providerId === "openai" && item.generationType === "automatic" ? (
                  <button className="secondary-button" type="button" onClick={() => onRetry(item)}>
                    Retry
                  </button>
                ) : null}
                <button className="secondary-button history-delete-button" type="button" onClick={() => onDismiss(item)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface RevisionPanelProps {
  parent: GenerationHistoryItem;
  status: "idle" | "submitting";
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (input: { revisionTypes: RevisionScope[]; revisionInstruction: string }) => void;
}

const revisionScopeOptions: Array<{ value: RevisionScope; label: string }> = [
  { value: "scene", label: "Scene" },
  { value: "composition", label: "Composition" },
  { value: "look", label: "Look" },
  { value: "pose", label: "Pose / body action" },
  { value: "product", label: "Product / reference" },
  { value: "output", label: "Output" },
  { value: "prompt", label: "Other instruction" }
];

function RevisionPanel({ parent, status, errorMessage, onCancel, onSubmit }: RevisionPanelProps) {
  const [selectedScopes, setSelectedScopes] = useState<RevisionScope[]>(["pose"]);
  const [instruction, setInstruction] = useState("Keep everything else unchanged. Change only the pose to a relaxed walking pose.");

  function toggleScope(scope: RevisionScope) {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  }

  return (
    <div className="revision-panel" data-testid="revision-panel">
      <div className="history-header">
        <div className="section-label">REVISION</div>
        <span>Starts from selected generation</span>
      </div>
      <p className="history-message">Revision will start from the selected generation, not the current workflow.</p>
      <dl className="result-meta">
        <div>
          <dt>Provider</dt>
          <dd>{providerLabel(parent.providerId)}</dd>
        </div>
        <div>
          <dt>Skill</dt>
          <dd>{skillLabel(parent.skillId, parent.skillName)}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{parent.model ?? "Manual"}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatHistoryTime(parent.createdAt)}</dd>
        </div>
        <div>
          <dt>Composition</dt>
          <dd>{compositionLabel(parent.compositionId)}</dd>
        </div>
        <div>
          <dt>Look</dt>
          <dd>{lookLabel(parent.lookId)}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>
            {aspectRatioLabel(parent.aspectRatio)} / {qualityLabel(parent.quality)}
          </dd>
        </div>
      </dl>
      <div className="revision-scope-list">
        {revisionScopeOptions.map((option) => (
          <label key={option.value} className="revision-scope">
            <input type="checkbox" checked={selectedScopes.includes(option.value)} onChange={() => toggleScope(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <label className="revision-instruction">
        <span className="section-label">Revision Instruction</span>
        <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={4} />
      </label>
      {errorMessage ? <p className="history-message">{errorMessage}</p> : null}
      <div className="result-actions">
        <button className="secondary-button" type="button" disabled={status === "submitting"} onClick={() => onSubmit({ revisionTypes: selectedScopes, revisionInstruction: instruction })}>
          {status === "submitting" ? "Creating" : "Create Revision"}
        </button>
        <button className="secondary-button" type="button" disabled={status === "submitting"} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

interface GenerationImageViewerProps {
  result: GenerationResultState;
  onClose: () => void;
}

function GenerationImageViewer({ result, onClose }: GenerationImageViewerProps) {
  const imageUrl = result.imageUrl ?? result.previousSuccess?.imageUrl;

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="image-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Generated image viewer">
      <div className="image-viewer">
        <div className="image-viewer-header">
          <div>
            <strong>Generated Preview</strong>
            <span>{[result.aspectRatio, result.quality, result.compositionId, result.lookId].filter(Boolean).join(" | ")}</span>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <Image src={imageUrl} alt="Generated outfit visual enlarged preview" width={1080} height={1440} unoptimized />
      </div>
    </div>
  );
}

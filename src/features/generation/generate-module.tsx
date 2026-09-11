"use client";

import { useRef, useState } from "react";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { generationProviderOptions, getGenerationProviderOption } from "@/config/generation-providers";
import { aspectRatioOptions, countOptions, modeOptions, qualityOptions } from "@/config/output-options";
import { buildGenerationConfig } from "@/features/generation/build-generation-config";
import { buildManualGenerationPackage } from "@/features/generation/manual-generation-package";
import { compileGenerationPlan } from "@/features/prompt-compiler/compile-generation-plan";
import { validateGenerationPlan } from "@/features/prompt-compiler/validate-generation-plan";
import { validateSelectedSkillInput } from "@/features/skill/skill-validation";
import { useGenerationResultStore } from "@/stores/generation-result-store";
import { useManualGenerationStore } from "@/stores/manual-generation-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { workflowDraftToSnapshot } from "@/lib/workflow/workflow-snapshot";
import type { GenerationExecutionResult } from "@/lib/generation/image-generation-types";
import type { OutputOption } from "@/types/domain";

interface GenerateModuleProps {
  onGenerate: () => void;
}

interface GenerateApiSuccess {
  result: GenerationExecutionResult;
  warnings: string[];
}

interface GenerateApiFailure {
  error: {
    code: string;
    message: string;
  };
}

function isGenerateApiFailure(value: unknown): value is GenerateApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.code === "string" &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.message === "string"
  );
}

function isGenerateApiSuccess(value: unknown): value is GenerateApiSuccess {
  const result = typeof value === "object" && value !== null ? (value as { result?: Partial<GenerationExecutionResult> }).result : null;

  return Boolean(
    result &&
      typeof result.providerId === "string" &&
      typeof result.model === "string" &&
      Array.isArray(result.images) &&
      result.images.length > 0 &&
      result.images.every((image) => typeof image?.imageUrl === "string") &&
      result.source &&
      typeof result.source.aspectRatio === "string" &&
      typeof result.source.quality === "string"
  );
}

export function GenerateModule({ onGenerate }: GenerateModuleProps) {
  const [automaticStatus, setAutomaticStatus] = useState<string | null>(null);
  const inFlightGenerationIdRef = useRef<string | null>(null);
  const contentType = useWorkflowStore((state) => state.contentType);
  const selectedSkillId = useWorkflowStore((state) => state.selectedSkillId);
  const productFidelity = useWorkflowStore((state) => state.productFidelity);
  const outfitSlots = useWorkflowStore((state) => state.outfitSlots);
  const scene = useWorkflowStore((state) => state.scene);
  const composition = useWorkflowStore((state) => state.composition);
  const look = useWorkflowStore((state) => state.look);
  const output = useWorkflowStore((state) => state.output);
  const setAspectRatio = useWorkflowStore((state) => state.setAspectRatio);
  const setGenerationProvider = useWorkflowStore((state) => state.setGenerationProvider);
  const setCount = useWorkflowStore((state) => state.setCount);
  const setQuality = useWorkflowStore((state) => state.setQuality);
  const setMode = useWorkflowStore((state) => state.setMode);
  const openManualPackage = useManualGenerationStore((state) => state.openPackage);
  const resultStatus = useGenerationResultStore((state) => state.status);
  const setQueued = useGenerationResultStore((state) => state.setQueued);
  const setGenerating = useGenerationResultStore((state) => state.setGenerating);
  const setSuccess = useGenerationResultStore((state) => state.setSuccess);
  const setError = useGenerationResultStore((state) => state.setError);

  const provider = getGenerationProviderOption(output.providerId);
  const generating = resultStatus === "queued" || resultStatus === "generating";

  async function generateOpenAIImage(generationId: string) {
    const workflowDraft = {
      contentType,
      selectedSkillId,
      productFidelity,
      outfitSlots,
      scene,
      composition,
      look,
      output
    };
    const workflowSnapshot = workflowDraftToSnapshot(workflowDraft);
    const localGenerationConfig = buildGenerationConfig(workflowDraft);
    const resultSnapshot = {
      generationId,
      skillId: localGenerationConfig.skillOrigin?.id ?? null,
      skillName: localGenerationConfig.skillOrigin?.name ?? null,
      providerId: output.providerId,
      aspectRatio: output.aspectRatio,
      quality: output.quality,
      compositionId: composition.preset,
      lookId: look
    };

    setAutomaticStatus(null);
    setQueued(resultSnapshot);
    setGenerating(resultSnapshot);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, workflowSnapshot })
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const failure = isGenerateApiFailure(payload)
          ? payload.error
          : { code: "IMAGE_GENERATION_REQUEST_FAILED", message: "Automatic image generation failed." };
        throw new Error(`${failure.code}: ${failure.message}`);
      }

      if (!isGenerateApiSuccess(payload)) {
        throw new Error("IMAGE_GENERATION_INVALID_RESPONSE: Generation response was invalid.");
      }

      const primaryImage = payload.result.images[0];

      setSuccess({
        generationId: payload.result.generationId ?? generationId,
        skillId: payload.result.source.skillOrigin?.id ?? null,
        skillName: payload.result.source.skillOrigin?.name ?? null,
        imageId: primaryImage.id,
        imageUrl: primaryImage.imageUrl,
        providerId: "openai",
        model: payload.result.model,
        originalFileName: primaryImage.fileName,
        mimeType: primaryImage.mimeType,
        width: primaryImage.width,
        height: primaryImage.height,
        durationMs: payload.result.durationMs,
        aspectRatio: payload.result.source.aspectRatio,
        quality: payload.result.source.quality,
        compositionId: payload.result.source.compositionId,
        lookId: payload.result.source.lookId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Automatic image generation failed.";
      const [errorCode, ...messageParts] = message.includes(": ") ? message.split(": ") : ["IMAGE_GENERATION_REQUEST_FAILED", message];
      setError({
        ...resultSnapshot,
        errorCode,
        errorMessage: messageParts.join(": ") || message
      });
    } finally {
      if (inFlightGenerationIdRef.current === generationId) {
        inFlightGenerationIdRef.current = null;
      }
    }
  }

  function handleGenerate() {
    if (inFlightGenerationIdRef.current || generating) {
      return;
    }

    if (output.providerId === "openai") {
      const generationId = crypto.randomUUID();
      inFlightGenerationIdRef.current = generationId;
      void generateOpenAIImage(generationId);
      return;
    }

    if (output.providerId !== "chatgpt_manual") {
      setAutomaticStatus("Automatic generation adapter ready, provider implementation pending.");
      onGenerate();
      return;
    }

    setAutomaticStatus(null);
    const workflowDraft = {
      contentType,
      selectedSkillId,
      productFidelity,
      outfitSlots,
      scene,
      composition,
      look,
      output
    };
    const workflowSnapshot = workflowDraftToSnapshot(workflowDraft);
    const skillValidation = validateSelectedSkillInput(workflowDraft);
    const generationConfig = buildGenerationConfig(workflowDraft);
    const generationPlan = compileGenerationPlan(generationConfig);
    const promptQA = validateGenerationPlan(generationPlan, generationConfig);
    openManualPackage(buildManualGenerationPackage(generationConfig, generationPlan, promptQA, skillValidation.status === "skipped" ? undefined : skillValidation, workflowSnapshot));
  }

  return (
    <WorkflowModule number="05" title="GENERATE" description="Configure the output.">
      <OptionGroup label="Provider" options={generationProviderOptions} value={output.providerId} disabled={generating} onChange={setGenerationProvider} />
      <p className="generate-note">
        {provider.label} / {provider.mode.toUpperCase()}: {provider.generateNote}
      </p>
      <OptionGroup label="Aspect Ratio" options={aspectRatioOptions} value={output.aspectRatio} onChange={setAspectRatio} />
      <OptionGroup label="Count" options={countOptions} value={output.count} onChange={setCount} />
      <OptionGroup label="Quality" options={qualityOptions} value={output.quality} onChange={setQuality} />
      <OptionGroup label="Mode" options={modeOptions} value={output.mode} onChange={setMode} />

      <button className="generate-button" type="button" data-testid="generate-button" disabled={generating} onClick={handleGenerate}>
        {generating ? "Generating" : output.providerId === "chatgpt_manual" ? "Generate Manual Package" : "Generate"}
      </button>
      <p className="generate-note">
        {output.providerId === "chatgpt_manual"
          ? "Creates the manual ChatGPT handoff package. No image generation API call is made."
          : output.providerId === "openai"
            ? "Runs OpenAI automatic image generation through the provider adapter."
            : (automaticStatus ?? "Automatic generation will use the provider adapter contract when implemented.")}
      </p>
    </WorkflowModule>
  );
}

interface OptionGroupProps<TValue extends string | number> {
  label: string;
  options: Array<OutputOption<TValue>>;
  value: TValue;
  disabled?: boolean;
  onChange: (value: TValue) => void;
}

function OptionGroup<TValue extends string | number>({ label, options, value, disabled = false, onChange }: OptionGroupProps<TValue>) {
  return (
    <div className="control-group">
      <div className="section-label">{label}</div>
      <div className="option-row" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "option-chip selected" : "option-chip"}
            type="button"
            aria-pressed={value === option.value}
            disabled={disabled}
            data-testid={`${label.toLowerCase().replaceAll(" ", "-")}-${option.value}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

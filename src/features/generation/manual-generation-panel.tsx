"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ManualPackageReferenceAsset } from "@/features/generation/manual-generation-package";
import { useManualGenerationStore } from "@/stores/manual-generation-store";

function statusLabel(status: string) {
  switch (status) {
    case "ready":
      return "Ready";
    case "warning":
      return "Warning";
    default:
      return "Blocked";
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function ReferenceAssetList({
  title,
  references,
  variant = "product"
}: {
  title: string;
  references: ManualPackageReferenceAsset[];
  variant?: "product" | "scene";
}) {
  if (!references.length) {
    return null;
  }

  return (
    <div className={variant === "scene" ? "manual-reference-group manual-reference-group-scene" : "manual-reference-group"}>
      <h4>{title}</h4>
      <div className="manual-reference-list">
        {references.map((reference) => (
          <div className={variant === "scene" ? "manual-reference-item manual-reference-item-scene" : "manual-reference-item"} key={`${reference.label}-${reference.originalFileName}`}>
            <Image src={reference.publicUrl} alt={reference.originalFileName} width={96} height={96} unoptimized />
            <div>
              <strong>{reference.label}</strong>
              <span>{reference.originalFileName}</span>
              <span>{`${reference.width}x${reference.height} | ${reference.mimeType}`}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ManualGenerationPanel() {
  const manualPackage = useManualGenerationStore((state) => state.package);
  const panelOpen = useManualGenerationStore((state) => state.panelOpen);
  const lastCopied = useManualGenerationStore((state) => state.lastCopied);
  const closePanel = useManualGenerationStore((state) => state.closePanel);
  const markCopied = useManualGenerationStore((state) => state.markCopied);
  const clearCopied = useManualGenerationStore((state) => state.clearCopied);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    if (!lastCopied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearCopied();
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [clearCopied, lastCopied]);

  if (!panelOpen || !manualPackage) {
    return null;
  }

  const currentPackage = manualPackage;
  const allReferences = [
    ...currentPackage.referenceAssets,
    ...(currentPackage.sceneReference ? [currentPackage.sceneReference] : [])
  ];

  async function handleCopyPrompt() {
    try {
      await copyText(currentPackage.finalPrompt);
      setCopyError("");
      markCopied("prompt");
    } catch {
      setCopyError("Clipboard permission was denied.");
    }
  }

  async function handleCopyPackage() {
    try {
      await copyText(currentPackage.fullPackageText);
      setCopyError("");
      markCopied("package");
    } catch {
      setCopyError("Clipboard permission was denied.");
    }
  }

  function handleOpenChatGPT() {
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  return (
    <aside className="manual-panel" aria-label="ChatGPT Manual Package" data-testid="manual-generation-panel">
      <div className="manual-panel-header">
        <div>
          <h2>ChatGPT Manual Package</h2>
          <p>Copy the prompt, provide references manually, then import the saved result.</p>
        </div>
        <button className="secondary-button" type="button" onClick={closePanel}>
          Close
        </button>
      </div>

      <div className={`manual-status manual-status-${currentPackage.status}`}>
        <strong>{statusLabel(currentPackage.status)}</strong>
        <span>
          {currentPackage.status === "blocked"
            ? "Manual package blocked by validation."
            : currentPackage.status === "warning"
              ? "Package can be used, but review Prompt QA warnings."
              : "Package is ready for manual ChatGPT handoff."}
        </span>
      </div>

      <section className="manual-section">
        <h3>Summary</h3>
        <p>{currentPackage.summary}</p>
      </section>

      <section className="manual-section">
        <h3>Manual Instructions</h3>
        <ol>
          {currentPackage.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
      </section>

      <section className="manual-section">
        <h3>Reference Images</h3>
        {allReferences.length ? (
          <>
            <ReferenceAssetList title="Outfit References" references={currentPackage.referenceAssets} />
            <ReferenceAssetList
              title="Scene Reference"
              references={currentPackage.sceneReference ? [currentPackage.sceneReference] : []}
              variant="scene"
            />
          </>
        ) : (
          <p>No reference images are attached. If product fidelity matters, upload product references before generating.</p>
        )}
      </section>

      <section className="manual-section">
        <h3>Output</h3>
        <dl className="manual-output-grid">
          <div>
            <dt>Aspect Ratio</dt>
            <dd>{currentPackage.output.aspectRatio}</dd>
          </div>
          <div>
            <dt>Quality</dt>
            <dd>{currentPackage.output.quality}</dd>
          </div>
          <div>
            <dt>Count</dt>
            <dd>{currentPackage.output.count}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{currentPackage.output.mode}</dd>
          </div>
        </dl>
      </section>

      <section className="manual-section">
        <div className="manual-section-heading">
          <h3>Final Prompt</h3>
          <div className="manual-actions manual-actions-primary" aria-label="Manual handoff actions">
            <button className="secondary-button manual-primary-action" type="button" onClick={handleCopyPrompt}>
              Copy Prompt
            </button>
            <button className="secondary-button manual-primary-action" type="button" onClick={handleCopyPackage}>
              Copy Full Package
            </button>
            <button className="secondary-button" type="button" onClick={handleOpenChatGPT}>
              Open ChatGPT
            </button>
          </div>
        </div>
        {copyError ? <p className="field-error">{copyError}</p> : null}
        {!copyError && lastCopied ? (
          <p className="field-status">{lastCopied === "prompt" ? "Prompt copied" : "Package copied"}</p>
        ) : null}
        <pre className="manual-prompt">{currentPackage.finalPrompt}</pre>
      </section>

      {currentPackage.skillValidation ? (
        <section className="manual-section">
          <h3>Skill Validation</h3>
          <dl className="manual-output-grid">
            <div>
              <dt>Status</dt>
              <dd>{currentPackage.skillValidation.status.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Issues</dt>
              <dd>{currentPackage.skillValidation.issues.length || "None"}</dd>
            </div>
          </dl>
          {currentPackage.skillValidation.issues.length ? (
            <ul className="manual-issue-list">
              {currentPackage.skillValidation.issues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`}>
                  {issue.severity.toUpperCase()} {issue.code}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="manual-section">
        <h3>Prompt QA</h3>
        <dl className="manual-output-grid">
          <div>
            <dt>Status</dt>
            <dd>{currentPackage.promptQA.status.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Issues</dt>
            <dd>{currentPackage.promptQA.issues.length || "None"}</dd>
          </div>
        </dl>
        {currentPackage.promptQA.issues.length ? (
          <ul className="manual-issue-list">
            {currentPackage.promptQA.issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>
                {issue.severity.toUpperCase()} {issue.code}: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  );
}

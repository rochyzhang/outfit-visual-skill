"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  fetchProviderStatuses,
  removeProviderCredential,
  saveProviderCredential,
  testProviderConnection,
  type ProviderId,
  type ProviderStatus
} from "@/features/settings/provider-settings-client";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

type RequestStatus = "idle" | "loading" | "saving" | "testing" | "removing" | "error" | "success";

function sourceLabel(source: ProviderStatus["source"]) {
  switch (source) {
    case "environment":
      return "Environment variable";
    case "local_secret_store":
      return "Local";
    default:
      return "None";
  }
}

function statusLabel(status: ProviderStatus) {
  if (status.comingLater) {
    return "Coming later";
  }

  if (status.mode === "manual") {
    return "Ready";
  }

  return status.available ? "Connected" : "Not configured";
}

function capabilityLabels(provider: ProviderStatus) {
  const entries: Array<[keyof ProviderStatus["capabilities"], string]> = [
    ["promptIntelligence", "prompt intelligence"],
    ["imageGeneration", "image generation"],
    ["manualGeneration", "manual generation"],
    ["imageEditing", "image editing"],
    ["multiImageReference", "multi-image reference"]
  ];

  return entries.filter(([key]) => provider.capabilities[key]).map(([, label]) => label);
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [message, setMessage] = useState("");
  const [activeProviderId, setActiveProviderId] = useState<ProviderId | null>(null);
  const [credentialInputs, setCredentialInputs] = useState<Partial<Record<ProviderId, string>>>({});
  const [replaceProviderId, setReplaceProviderId] = useState<ProviderId | null>(null);
  const [manualFlowOpen, setManualFlowOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadStatuses() {
      setRequestStatus("loading");
      setMessage("");

      try {
        const statuses = await fetchProviderStatuses();

        if (cancelled) {
          return;
        }

        setProviders(statuses);
        setRequestStatus("idle");
        setReplaceProviderId(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Could not load provider settings.");
        setRequestStatus("error");
      }
    }

    loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function updateProviderStatus(status: ProviderStatus) {
    setProviders((current) => current.map((provider) => (provider.providerId === status.providerId ? status : provider)));
  }

  function setCredentialInput(providerId: ProviderId, value: string) {
    setCredentialInputs((current) => ({
      ...current,
      [providerId]: value
    }));
  }

  function clearCredentialInput(providerId: ProviderId) {
    setCredentialInputs((current) => ({
      ...current,
      [providerId]: ""
    }));
  }

  async function handleSaveCredential(event: FormEvent<HTMLFormElement>, providerId: ProviderId) {
    event.preventDefault();
    const credential = credentialInputs[providerId] ?? "";
    clearCredentialInput(providerId);
    setRequestStatus("saving");
    setActiveProviderId(providerId);
    setMessage("");

    try {
      const status = await saveProviderCredential(providerId, credential);
      updateProviderStatus(status);
      setReplaceProviderId(null);
      setRequestStatus("success");
      setMessage(`${status.name} credential saved.`);
    } catch (error) {
      setRequestStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save provider credential.");
    }
  }

  async function handleRemoveCredential(providerId: ProviderId) {
    setRequestStatus("removing");
    setActiveProviderId(providerId);
    setMessage("");

    try {
      const status = await removeProviderCredential(providerId);
      clearCredentialInput(providerId);
      updateProviderStatus(status);
      setReplaceProviderId(null);
      setRequestStatus("success");
      setMessage(status.message || `${status.name} credential removed.`);
    } catch (error) {
      setRequestStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not remove provider credential.");
    }
  }

  async function handleTestConnection(providerId: ProviderId) {
    setRequestStatus("testing");
    setActiveProviderId(providerId);
    setMessage("");

    try {
      const result = await testProviderConnection(providerId);
      clearCredentialInput(providerId);
      setRequestStatus("success");
      setMessage(result.message);
    } catch (error) {
      clearCredentialInput(providerId);
      setRequestStatus("error");
      setMessage(error instanceof Error ? error.message : "Provider connection failed.");
    }
  }

  return (
    <aside className="settings-panel" aria-label="Settings panel">
      <div className="settings-panel-header">
        <div>
          <h2>Settings</h2>
          <p>Local provider configuration.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <section className="settings-section">
        <div className="settings-section-header">
          <h3>Providers</h3>
          <span className="provider-status">{requestStatus === "loading" ? "Loading" : `${providers.length} configured options`}</span>
        </div>

        <div className="provider-card-list">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.providerId}
              provider={provider}
              credentialInput={credentialInputs[provider.providerId] ?? ""}
              replaceMode={replaceProviderId === provider.providerId}
              requestStatus={requestStatus}
              active={activeProviderId === provider.providerId}
              onCredentialInput={(value) => setCredentialInput(provider.providerId, value)}
              onSave={(event) => handleSaveCredential(event, provider.providerId)}
              onReplace={() => setReplaceProviderId(provider.providerId)}
              onRemove={() => handleRemoveCredential(provider.providerId)}
              onTest={() => handleTestConnection(provider.providerId)}
              manualFlowOpen={manualFlowOpen && provider.providerId === "chatgpt_manual"}
              onToggleManualFlow={() => setManualFlowOpen((current) => !current)}
            />
          ))}
        </div>

        {message ? (
          <p className={requestStatus === "error" ? "field-error" : "field-status"}>{message}</p>
        ) : null}
      </section>
    </aside>
  );
}

interface ProviderCardProps {
  provider: ProviderStatus;
  credentialInput: string;
  replaceMode: boolean;
  requestStatus: RequestStatus;
  active: boolean;
  onCredentialInput: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onReplace: () => void;
  onRemove: () => void;
  onTest: () => void;
  manualFlowOpen: boolean;
  onToggleManualFlow: () => void;
}

function ProviderCard({
  provider,
  credentialInput,
  replaceMode,
  requestStatus,
  active,
  onCredentialInput,
  onSave,
  onReplace,
  onRemove,
  onTest,
  manualFlowOpen,
  onToggleManualFlow
}: ProviderCardProps) {
  const environmentActive = provider.source === "environment";
  const localActive = provider.source === "local_secret_store";
  const manualProvider = provider.mode === "manual";
  const canEditLocalCredential = provider.supportsCredential && !provider.comingLater && !environmentActive;
  const showCredentialForm = canEditLocalCredential && (!localActive || replaceMode);

  return (
    <article className={provider.comingLater ? "provider-card provider-card-disabled" : "provider-card"}>
      <div className="provider-card-header">
        <div>
          <h4>{provider.name}</h4>
          <p>{provider.description}</p>
        </div>
        <span className={provider.available ? "provider-status provider-status-connected" : "provider-status"}>
          {statusLabel(provider)}
        </span>
      </div>

      <dl className="provider-meta">
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel(provider.source)}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{provider.mode === "manual" ? "Manual" : "API"}</dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>{capabilityLabels(provider).join(", ") || "None"}</dd>
        </div>
        {provider.model ? (
          <div>
            <dt>Model</dt>
            <dd>{provider.model}</dd>
          </div>
        ) : null}
        <div>
          <dt>Credential</dt>
          <dd>
            {environmentActive
              ? "Configured via environment"
              : manualProvider
                ? "Not required"
                : provider.maskedCredential ?? (provider.comingLater ? "Coming later" : "Not configured")}
          </dd>
        </div>
      </dl>

      {environmentActive ? (
        <p className="settings-note">Environment configuration has priority over local Provider Settings.</p>
      ) : null}

      {provider.comingLater ? <p className="settings-note">Credential support for this provider is coming later.</p> : null}

      {manualProvider ? (
        <div className="settings-note">
          <p>This mode does not call an API automatically. It prepares a manual generation workflow for ChatGPT use.</p>
          <button className="secondary-button" type="button" onClick={onToggleManualFlow}>
            View Manual Flow
          </button>
          {manualFlowOpen ? (
            <p>
              Generate compiles the prompt and QA locally. A later task can package that output for manual ChatGPT use without
              reading browser session state.
            </p>
          ) : null}
        </div>
      ) : null}

      {showCredentialForm ? (
        <form className="provider-key-form" onSubmit={onSave}>
          <label className="control-group">
            <span className="section-label">API Key</span>
            <input
              className="settings-input"
              type="password"
              value={credentialInput}
              autoComplete="off"
              placeholder={provider.providerId === "openai" ? "sk-..." : "Paste API key"}
              onChange={(event) => onCredentialInput(event.target.value)}
            />
          </label>
          <button className="secondary-button" type="submit" disabled={requestStatus === "saving" && active}>
            {requestStatus === "saving" && active ? "Saving" : "Save Key"}
          </button>
        </form>
      ) : null}

      <div className="settings-actions">
        {provider.available && (provider.supportsCredential || manualProvider) ? (
          <button className="secondary-button" type="button" disabled={requestStatus === "testing" && active} onClick={onTest}>
            {requestStatus === "testing" && active ? "Testing" : "Test Connection"}
          </button>
        ) : null}
        {localActive && !replaceMode ? (
          <button className="secondary-button" type="button" onClick={onReplace}>
            Replace Key
          </button>
        ) : null}
        {localActive ? (
          <button className="secondary-button" type="button" disabled={requestStatus === "removing" && active} onClick={onRemove}>
            {requestStatus === "removing" && active ? "Removing" : "Remove Key"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

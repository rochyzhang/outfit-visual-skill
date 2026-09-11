"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { acceptedImageMimeTypes, formatBytes } from "@/config/assets";
import { uploadAsset } from "@/lib/assets/upload-asset";
import type { Asset, OutfitSlotDefinition } from "@/types/domain";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface OutfitSlotProps {
  slot: OutfitSlotDefinition;
  asset: Asset | null;
  onChange: (slot: OutfitSlotDefinition, asset: Asset) => void;
  onRemove: (slot: OutfitSlotDefinition) => void;
}

export function isSupportedImage(file: File) {
  return acceptedImageMimeTypes.includes(file.type as (typeof acceptedImageMimeTypes)[number]);
}

export function OutfitSlot({ slot, asset, onChange, onRemove }: OutfitSlotProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
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
      const uploadedAsset = await uploadAsset(file, "product");
      onChange(slot, uploadedAsset);
      setStatus("success");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className={asset ? "outfit-slot loaded" : "outfit-slot"}>
      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid={`outfit-slot-input-${slot.key}`}
        onChange={handleFileChange}
      />

      {asset ? (
        <>
          <Image
            className="slot-thumbnail"
            src={asset.publicUrl}
            alt={`${slot.label} preview`}
            width={180}
            height={180}
            unoptimized
          />
          <div className="slot-footer">
            <span className="slot-name">{slot.label}</span>
            <span className="slot-asset-meta">
              {`${asset.originalFileName} · ${asset.width}x${asset.height} · ${formatBytes(asset.sizeBytes)}`}
            </span>
            <div className="slot-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={status === "uploading"}
                aria-label={`Replace ${slot.label} image`}
              >
                {status === "uploading" ? "Uploading" : "Replace"}
              </button>
              <button
                className="text-button danger"
                type="button"
                onClick={() => onRemove(slot)}
                disabled={status === "uploading"}
                aria-label={`Remove ${slot.label} image`}
              >
                Remove
              </button>
            </div>
          </div>
        </>
      ) : (
        <label className="slot-empty" htmlFor={inputId}>
          <span className="slot-name">{slot.label}</span>
          <span className="slot-upload">{status === "uploading" ? "Uploading" : "Upload"}</span>
        </label>
      )}

      {status === "success" && asset ? <p className="field-status">Stored asset preview</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

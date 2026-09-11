"use client";

import { OutfitSlot } from "./outfit-slot";
import { contentTypes } from "@/config/content-types";
import { outfitSlotDefinitions } from "@/config/outfit-slots";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { useWorkflowStore } from "@/stores/workflow-store";

export const outfitSlots = outfitSlotDefinitions;

export function OutfitModule() {
  const contentType = useWorkflowStore((state) => state.contentType);
  const productFidelity = useWorkflowStore((state) => state.productFidelity);
  const slots = useWorkflowStore((state) => state.outfitSlots);
  const setContentType = useWorkflowStore((state) => state.setContentType);
  const setProductFidelity = useWorkflowStore((state) => state.setProductFidelity);
  const setOutfitSlotAsset = useWorkflowStore((state) => state.setOutfitSlotAsset);
  const removeOutfitSlotAsset = useWorkflowStore((state) => state.removeOutfitSlotAsset);

  return (
    <WorkflowModule number="01" title="OUTFIT" description="Build the look." wide>
      <div className="control-group">
        <div className="segmented-control" aria-label="Content type">
          {contentTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={contentType === type.id ? "segment selected" : "segment"}
              aria-pressed={contentType === type.id}
              data-testid={`content-type-${type.id}`}
              onClick={() => setContentType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fidelity-control">
        <div>
          <div className="control-label">Product Fidelity</div>
          <p>Preserve garment shape, color, material, graphics and proportions.</p>
        </div>
        <button
          className={productFidelity ? "toggle selected" : "toggle"}
          type="button"
          aria-pressed={productFidelity}
          data-testid="product-fidelity-toggle"
          onClick={() => setProductFidelity(!productFidelity)}
        >
          {productFidelity ? "ON" : "OFF"}
        </button>
      </div>

      <div className="slot-grid" aria-label="Outfit slots">
        {outfitSlots.map((slot) => (
          <OutfitSlot
            key={slot.key}
            slot={slot}
            asset={slots[slot.key]}
            onChange={setOutfitSlotAsset}
            onRemove={removeOutfitSlotAsset}
          />
        ))}
      </div>
    </WorkflowModule>
  );
}

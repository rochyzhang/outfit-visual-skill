"use client";

import { PresetCard } from "@/components/workflow/preset-card";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { compositionPresets } from "@/config/presets/compositions";
import { graphicPresets } from "@/config/presets/graphics";
import { useWorkflowStore } from "@/stores/workflow-store";

export function CompositionModule() {
  const composition = useWorkflowStore((state) => state.composition.preset);
  const graphic = useWorkflowStore((state) => state.composition.graphic);
  const setCompositionPreset = useWorkflowStore((state) => state.setCompositionPreset);
  const setGraphicPreset = useWorkflowStore((state) => state.setGraphicPreset);

  return (
    <WorkflowModule number="03" title="COMPOSITION" description="Choose how the look is arranged.">
      <div className="control-group">
        <div className="preset-stack composition-stack">
          {compositionPresets.map((option) => (
            <PresetCard
              key={option.id}
              id={option.id}
              name={option.name}
              description={option.shortDescription}
              selected={composition === option.id}
              onSelect={() => setCompositionPreset(option.id)}
              testId={`composition-preset-${option.id}`}
              visual="concrete"
            />
          ))}
        </div>
      </div>

      <div className="control-group">
        <div className="section-label">Graphic Overlay</div>
        <div className="overlay-grid">
          {graphicPresets.map((option) => (
            <button
              key={option.id}
              className={graphic === option.id ? "overlay-option selected" : "overlay-option"}
              type="button"
              aria-pressed={graphic === option.id}
              data-testid={`graphic-${option.id}`}
              onClick={() => setGraphicPreset(option.id)}
            >
              <span>{option.id}</span>
              <strong>{option.name}</strong>
            </button>
          ))}
        </div>
      </div>
    </WorkflowModule>
  );
}
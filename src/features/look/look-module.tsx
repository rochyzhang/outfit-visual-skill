"use client";

import { PresetCard } from "@/components/workflow/preset-card";
import { WorkflowModule } from "@/components/workflow/workflow-module";
import { lookPresets } from "@/config/presets/looks";
import { useWorkflowStore } from "@/stores/workflow-store";

export function LookModule() {
  const look = useWorkflowStore((state) => state.look);
  const setLookPreset = useWorkflowStore((state) => state.setLookPreset);

  return (
    <WorkflowModule number="04" title="LOOK / LIGHT" description="Set the visual atmosphere.">
      <div className="preset-stack">
        {lookPresets.map((option) => (
          <PresetCard
            key={option.id}
            id={option.id}
            name={option.name}
            description={option.shortDescription}
            selected={look === option.id}
            onSelect={() => setLookPreset(option.id)}
            visual={option.visual}
            testId={`look-preset-${option.id}`}
          />
        ))}
      </div>
    </WorkflowModule>
  );
}
"use client";

import { useState } from "react";
import { DebugPanel } from "./debug-panel";
import { CompositionModule } from "@/features/composition/composition-module";
import { GenerateModule } from "@/features/generation/generate-module";
import { ManualGenerationPanel } from "@/features/generation/manual-generation-panel";
import { ResultModule } from "@/features/generation/result-module";
import { LookModule } from "@/features/look/look-module";
import { OutfitModule } from "@/features/outfit/outfit-module";
import { SceneModule } from "@/features/scene/scene-module";
import { SkillModule } from "@/features/skill/skill-module";

export function WorkflowCanvas() {
  const [debugOpen, setDebugOpen] = useState(false);

  return (
    <div className="workflow-stage">
      <div className="workflow-scroll" aria-label="Outfit workflow canvas">
        <div className="workflow-track">
          <SkillModule />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <OutfitModule />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <SceneModule />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <CompositionModule />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <LookModule />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <GenerateModule onGenerate={() => setDebugOpen(true)} />
          <div className="workflow-connector" aria-hidden="true">
            -&gt;
          </div>
          <ResultModule />
        </div>
      </div>

      <DebugPanel open={debugOpen} onClose={() => setDebugOpen(false)} />
      <ManualGenerationPanel />
    </div>
  );
}



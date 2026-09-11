import { promptQALengthThresholds, type PromptQAIssue, type PromptQAResult } from "./prompt-qa-types";
import type { GenerationPlan, GenerationPlanInstructions } from "./compiler-types";
import type { GenerationConfig } from "@/types/domain";

interface NamedSection {
  name: keyof GenerationPlanInstructions;
  label: string;
  text: string;
}

const requiredPromptHeadings = [
  "[01 TASK]",
  "[02 PRODUCT REFERENCES]",
  "[04 COMPOSITION]",
  "[06 SCENE]",
  "[14 OUTPUT]"
] as const;

const sceneStyleBoundaryTerms = [
  "film grain",
  "analog grain",
  "photographic grading",
  "grading",
  "contrast curve",
  "camera lens",
  "cinematic",
  "mood",
  "tonal response"
] as const;

const lookPhysicalEnvironmentTerms = [
  "concrete floor",
  "fabric backdrop",
  "plaster wall",
  "chair",
  "city street",
  "physical background",
  "physical backdrop",
  "studio wall"
] as const;

const meaningfulStylePhrases = [
  "warm directional",
  "soft diffused",
  "analog film grain",
  "film grain",
  "deep soft shadows",
  "soft shadows",
  "cinematic",
  "muted tonal",
  "color grading",
  "photographic treatment"
] as const;

function lower(value: string) {
  return value.toLowerCase();
}

function includesAny(value: string, terms: readonly string[]) {
  const normalized = lower(value);
  return terms.some((term) => normalized.includes(term));
}

function issue(input: PromptQAIssue): PromptQAIssue {
  return input;
}

function sections(plan: GenerationPlan): NamedSection[] {
  return Object.entries(plan.instructions).map(([name, text]) => ({
    name: name as keyof GenerationPlanInstructions,
    label: name,
    text: text ?? ""
  }));
}

function styleSections(plan: GenerationPlan): NamedSection[] {
  return [
    { name: "lighting", label: "Lighting", text: plan.instructions.lighting },
    { name: "color", label: "Color", text: plan.instructions.color },
    { name: "contrast", label: "Contrast", text: plan.instructions.contrast },
    { name: "texture", label: "Texture", text: plan.instructions.texture },
    { name: "mood", label: "Mood", text: plan.instructions.mood }
  ];
}

function hasAffirmativeConflict(text: string, pattern: RegExp) {
  return text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .some((part) => pattern.test(part) && !/^do not\b|^no\b|must not\b|never\b/i.test(part));
}

function hasAffirmativeVisiblePersonInstruction(text: string) {
  const visiblePersonPattern = /\bvisible\b.*(?:model|person)|full-body model/i;
  const negationBeforeVisiblePattern = /\b(no|without|do not|must not|never|prohibit\w*)\b.*\bvisible\b/i;

  return text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .some((part) => visiblePersonPattern.test(part) && !negationBeforeVisiblePattern.test(part));
}

function sectionCount(finalPrompt: string) {
  return finalPrompt.match(/\[\d{2} [^\]]+\]/g)?.length ?? 0;
}

function checkSceneLookConflict(plan: GenerationPlan, config: GenerationConfig): PromptQAIssue[] {
  const sceneText = lower(plan.instructions.scene);
  const lookText = lower(
    [
      plan.instructions.lighting,
      plan.instructions.color,
      plan.instructions.contrast,
      plan.instructions.texture,
      plan.instructions.mood
    ].join(" ")
  );
  const sceneIsWhite = sceneText.includes("white studio") || sceneText.includes("warm-white");
  const lookIntroducesPhysicalBurgundy =
    (lookText.includes("burgundy") || lookText.includes("deep red")) &&
    (lookText.includes("backdrop") || lookText.includes("background") || lookText.includes("wall"));

  if (sceneIsWhite && lookIntroducesPhysicalBurgundy) {
    return [
      issue({
        code: "SCENE_LOOK_CONFLICT",
        severity: "error",
        section: "Look",
        message: "Look introduces a physical burgundy/red background while Scene is White Studio."
      })
    ];
  }

  const lookHasPhysicalEnvironment = includesAny(lookText, lookPhysicalEnvironmentTerms);
  const sceneHasDifferentPhysicalContext =
    (config.scene.id === "S01" && !lookText.includes("white")) ||
    (config.scene.id === "S03" && !lookText.includes("concrete")) ||
    (config.scene.id === "S04" && !lookText.includes("burgundy"));

  if (lookHasPhysicalEnvironment && sceneHasDifferentPhysicalContext) {
    return [
      issue({
        code: "SCENE_LOOK_CONFLICT",
        severity: "warning",
        section: "Look",
        message: "Look appears to introduce physical environment terms that may conflict with the selected Scene."
      })
    ];
  }

  return [];
}

function checkDuplicateStyleWeight(plan: GenerationPlan): PromptQAIssue[] {
  const matches = meaningfulStylePhrases.flatMap((phrase) => {
    const hitSections = styleSections(plan).filter((section) => lower(section.text).includes(phrase));
    return hitSections.length >= 3 ? [{ phrase, count: hitSections.length }] : [];
  });

  return matches.map((match) =>
    issue({
      code: "DUPLICATE_STYLE_WEIGHT",
      severity: "warning",
      section: "Look",
      message: `"${match.phrase}" is reinforced across ${match.count} visual-style sections.`
    })
  );
}

function normalizeInstruction(value: string) {
  return lower(value)
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkDuplicateInstruction(plan: GenerationPlan): PromptQAIssue[] {
  const counts = new Map<string, number>();

  sections(plan).forEach((section) => {
    section.text
      .split(/[.;\n]/)
      .map(normalizeInstruction)
      .filter((sentence) => sentence.length > 36)
      .forEach((sentence) => counts.set(sentence, (counts.get(sentence) ?? 0) + 1));
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 2)
    .map(([sentence, count]) =>
      issue({
        code: "DUPLICATE_INSTRUCTION",
        severity: "warning",
        message: `Near-identical instruction is repeated ${count} times: "${sentence.slice(0, 80)}".`
      })
    );
}

function checkGraphicOverridesComposition(plan: GenerationPlan): PromptQAIssue[] {
  const graphic = plan.instructions.graphic;

  if (!graphic) {
    return [];
  }

  const conflictTerms = ["top-down", "eye-level", "camera view", "standing pose", "garment arrangement", "backdrop", "scene"];

  if (!includesAny(graphic, conflictTerms)) {
    return [];
  }

  return [
    issue({
      code: "GRAPHIC_OVERRIDES_COMPOSITION",
      severity: "warning",
      section: "Graphic Overlay",
      message: "Graphic instructions appear to redefine composition, camera, pose, or scene responsibilities."
    })
  ];
}

function checkGraphicContentInvention(plan: GenerationPlan): PromptQAIssue[] {
  const graphic = plan.instructions.graphic ?? "";
  const inventionPatterns = [/\b\d{1,2}%\s*off\b/i, /\$\s*\d+/i, /\bsku\b/i, /\bfake brand\b/i, /\bfake product\b/i];

  if (!inventionPatterns.some((pattern) => pattern.test(graphic))) {
    return [];
  }

  return [
    issue({
      code: "GRAPHIC_CONTENT_INVENTION",
      severity: "error",
      section: "Graphic Overlay",
      message: "Graphic instructions invent promotional, SKU, product-name, brand, price, or discount content."
    })
  ];
}

function checkProductFidelityConflict(plan: GenerationPlan, config: GenerationConfig): PromptQAIssue[] {
  const candidateText = sections(plan)
    .filter((section) => section.name !== "productFidelity" && section.name !== "prohibitedBehavior")
    .map((section) => section.text)
    .join("\n");
  const strictConflict = /(redesign|recolor|replace|reinterpret|alter logo|add new pattern|change material|change the .* to)/i;
  const looseConflict = /(replace uploaded outfit|unrelated products|different outfit)/i;

  if (config.productFidelity && hasAffirmativeConflict(candidateText, strictConflict)) {
    return [
      issue({
        code: "PRODUCT_FIDELITY_CONFLICT",
        severity: "error",
        message: "Prompt contains garment redesign/replacement instructions while Product Fidelity is ON."
      })
    ];
  }

  if (!config.productFidelity && hasAffirmativeConflict(candidateText, looseConflict)) {
    return [
      issue({
        code: "PRODUCT_FIDELITY_CONFLICT",
        severity: "warning",
        message: "Prompt appears to replace uploaded outfit references with unrelated products."
      })
    ];
  }

  return [];
}

function checkRevision(plan: GenerationPlan, config: GenerationConfig): PromptQAIssue[] {
  if (!plan.revision) {
    return [];
  }

  const instruction = plan.revision.instruction.trim();

  if (!instruction) {
    return [
      issue({
        code: "EMPTY_REVISION",
        severity: "error",
        section: "Revision",
        message: "Revision must include a scope or instruction."
      })
    ];
  }

  const normalized = lower(`${plan.revision.revisionType} ${instruction}`);
  const garmentChange = /(redesign|recolor|replace|reinterpret|change the .* to|jacket into|garment into|different outfit|new outfit)/i;
  const scopeIsProduct = plan.revision.revisionType === "product" || plan.revision.revisionType === "mixed";

  if (!scopeIsProduct && garmentChange.test(normalized)) {
    return [
      issue({
        code: "REVISION_SCOPE_CONFLICT",
        severity: "error",
        section: "Revision",
        message: "Revision instruction changes product or garment details outside the selected revision scope."
      })
    ];
  }

  if (config.productFidelity && garmentChange.test(normalized)) {
    return [
      issue({
        code: "PRODUCT_FIDELITY_CONFLICT",
        severity: "error",
        section: "Revision",
        message: "Revision attempts to redesign referenced products while Product Fidelity is ON."
      })
    ];
  }

  return [];
}

function checkProductCompleteness(config: GenerationConfig): PromptQAIssue[] {
  const issues: PromptQAIssue[] = [];
  const hasShoes = config.products.some((product) => product.slot.key === "shoes");

  if (!config.products.length) {
    issues.push(
      issue({
        code: "NO_PRODUCTS",
        severity: "warning",
        section: "Product References",
        message: "No uploaded product references are attached."
      })
    );
  }

  if ((config.composition.id === "C01" || config.composition.id === "C04") && !hasShoes) {
    issues.push(
      issue({
        code: "MISSING_CORE_PRODUCT",
        severity: "warning",
        section: "Product References",
        message: `${config.composition.id} is selected but shoes are missing.`
      })
    );
  }

  return issues;
}

function checkCompositionRequirementMismatch(plan: GenerationPlan, config: GenerationConfig): PromptQAIssue[] {
  const compositionText = lower(`${plan.instructions.composition}\n${plan.instructions.camera}`);
  const prohibitedText = lower(plan.instructions.prohibitedBehavior);
  const issues: PromptQAIssue[] = [];

  if (
    (config.composition.id === "C01" || config.composition.id === "C04") &&
    hasAffirmativeVisiblePersonInstruction(compositionText)
  ) {
    issues.push(
      issue({
        code: "COMPOSITION_REQUIREMENT_MISMATCH",
        severity: "error",
        section: "Composition",
        message: `${config.composition.id} conflicts with a visible person/model instruction.`
      })
    );
  }

  if (config.composition.id === "C02" && /eye-level|standing camera|standing view/.test(compositionText)) {
    issues.push(
      issue({
        code: "COMPOSITION_REQUIREMENT_MISMATCH",
        severity: "error",
        section: "Composition",
        message: "C02 flat lay conflicts with eye-level or standing-camera instruction."
      })
    );
  }

  if (config.composition.id === "C03" && !config.scene.reference && config.scene.id === "S06" && !config.scene.customPrompt.trim()) {
    issues.push(
      issue({
        code: "COMPOSITION_REQUIREMENT_MISMATCH",
        severity: "warning",
        section: "Composition",
        message: "C03 Chair/Object Styling has no scene reference or useful object/support context."
      })
    );
  }

  if (config.composition.id === "C05" && /no human model|no model representation|prohibit.*model/.test(prohibitedText)) {
    issues.push(
      issue({
        code: "COMPOSITION_REQUIREMENT_MISMATCH",
        severity: "warning",
        section: "Composition",
        message: "C05 should not globally prohibit a primary model representation."
      })
    );
  }

  return issues;
}

function checkSceneResponsibility(plan: GenerationPlan): PromptQAIssue[] {
  if (!includesAny(plan.instructions.scene, sceneStyleBoundaryTerms)) {
    return [];
  }

  return [
    issue({
      code: "SCENE_RESPONSIBILITY_VIOLATION",
      severity: "warning",
      section: "Scene",
      message: "Scene section appears to own photographic grading, grain, contrast, lens, or mood responsibilities."
    })
  ];
}

function checkLookResponsibility(plan: GenerationPlan): PromptQAIssue[] {
  const lookText = styleSections(plan)
    .map((section) => section.text)
    .join(" ");

  if (!includesAny(lookText, lookPhysicalEnvironmentTerms)) {
    return [];
  }

  return [
    issue({
      code: "LOOK_RESPONSIBILITY_VIOLATION",
      severity: "warning",
      section: "Look",
      message: "Look section appears to hardcode physical environment objects instead of photographic treatment."
    })
  ];
}

function checkPromptLength(plan: GenerationPlan): PromptQAIssue[] {
  if (plan.finalPrompt.length > promptQALengthThresholds.strongWarning) {
    return [
      issue({
        code: "OVERLONG_FINAL_PROMPT",
        severity: "warning",
        message: `Final prompt is ${plan.finalPrompt.length} characters, above the ${promptQALengthThresholds.strongWarning} strong warning threshold.`
      })
    ];
  }

  if (plan.finalPrompt.length > promptQALengthThresholds.warning) {
    return [
      issue({
        code: "OVERLONG_FINAL_PROMPT",
        severity: "warning",
        message: `Final prompt is ${plan.finalPrompt.length} characters, above the ${promptQALengthThresholds.warning} warning threshold.`
      })
    ];
  }

  return [];
}

function checkRequiredSections(plan: GenerationPlan): PromptQAIssue[] {
  const requiredHeadings = plan.revision ? requiredPromptHeadings.map((heading) => (heading === "[14 OUTPUT]" ? "[15 OUTPUT]" : heading)) : requiredPromptHeadings;

  return requiredHeadings
    .filter((heading) => !plan.finalPrompt.includes(heading))
    .map((heading) =>
      issue({
        code: "EMPTY_REQUIRED_SECTION",
        severity: "error",
        section: heading,
        message: `Required prompt section ${heading} is missing.`
      })
    );
}

function checkInternalPathLeak(plan: GenerationPlan): PromptQAIssue[] {
  const payload = `${plan.finalPrompt}\n${JSON.stringify(plan)}`;
  const internalPathPattern = /[A-Z]:\\|\/Users\/|\/home\/|data\/outfit-visual-studio\.db|storage\/assets\/|blob:/i;

  if (!internalPathPattern.test(payload)) {
    return [];
  }

  return [
    issue({
      code: "INTERNAL_PATH_LEAK",
      severity: "error",
      message: "Prompt or GenerationPlan contains an internal path, database path, or blob URL."
    })
  ];
}

function checkSecretLeak(plan: GenerationPlan): PromptQAIssue[] {
  const payload = `${plan.finalPrompt}\n${JSON.stringify(plan)}`;

  if (!/OPENAI_API_KEY|sk-[A-Za-z0-9_-]{12,}/.test(payload)) {
    return [];
  }

  return [
    issue({
      code: "SECRET_LEAK_PATTERN",
      severity: "error",
      message: "Prompt or GenerationPlan contains a value matching a secret/API-key pattern."
    })
  ];
}

export function validateGenerationPlan(plan: GenerationPlan, generationConfig: GenerationConfig): PromptQAResult {
  const issues = [
    ...checkSceneLookConflict(plan, generationConfig),
    ...checkDuplicateStyleWeight(plan),
    ...checkDuplicateInstruction(plan),
    ...checkGraphicOverridesComposition(plan),
    ...checkGraphicContentInvention(plan),
    ...checkRevision(plan, generationConfig),
    ...checkProductFidelityConflict(plan, generationConfig),
    ...checkProductCompleteness(generationConfig),
    ...checkCompositionRequirementMismatch(plan, generationConfig),
    ...checkSceneResponsibility(plan),
    ...checkLookResponsibility(plan),
    ...checkPromptLength(plan),
    ...checkRequiredSections(plan),
    ...checkInternalPathLeak(plan),
    ...checkSecretLeak(plan)
  ];
  const warningCount = issues.filter((item) => item.severity === "warning").length;
  const errorCount = issues.filter((item) => item.severity === "error").length;

  return {
    status: errorCount ? "fail" : warningCount ? "warning" : "pass",
    issues,
    metrics: {
      promptLength: plan.finalPrompt.length,
      sectionCount: sectionCount(plan.finalPrompt),
      warningCount,
      errorCount
    }
  };
}

import {
  baseProhibitedBehavior,
  graphicSafeguardInstruction,
  lightProductReferenceInstruction,
  productPriorityInstruction,
  strictProductFidelityInstruction
} from "./compiler-fragments";
import {
  contentTypePhrase,
  generationPlanVersion,
  type GenerationPlan,
  type GenerationPlanProduct,
  type PromptSection
} from "./compiler-types";
import type { GenerationConfig } from "@/types/domain";
import type { GenerationPlanRevision } from "./compiler-types";

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function productReferenceLine(product: GenerationPlanProduct) {
  return `${product.slot.label.toUpperCase()}: uploaded reference image (${product.originalFileName}, ${product.mimeType}, ${product.width}x${product.height}).`;
}

function buildTaskInstruction(config: GenerationConfig) {
  const content = contentTypePhrase(config.contentType.id);
  return `Create a contemporary ${content} fashion editorial image using the uploaded garment references and the selected ${config.composition.name} composition.`;
}

function buildProductReferences(products: GenerationPlanProduct[]) {
  if (!products.length) {
    return "No uploaded product references are currently attached.";
  }

  return products.map(productReferenceLine).join("\n");
}

function buildCompositionInstruction(config: GenerationConfig) {
  const requirements = config.composition.requirements.length
    ? ` Required constraints: ${config.composition.requirements.join("; ")}.`
    : "";
  const skillModifier =
    config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL"
      ? " Skill-specific modifier for SK06: use C04 only as a base for a Korean independent-brand assembled editorial poster, not as a complete invisible walking body. Prefer deliberate item spacing, partial suspension, slight misalignment between pieces, clean negative space, and graphic product indexing. The top or outer may retain wearable form, but the bottom, shoes, bag, and accessories should feel styled, suspended, offset, or independently placed rather than all worn by one continuous invisible person."
      : "";

  return `${config.promptFragments.composition}.${requirements}${skillModifier}`;
}

function buildSceneInstruction(config: GenerationConfig) {
  const sceneFragment = clean(config.promptFragments.scene);
  const reference = config.scene.reference
    ? ` Scene reference image is available (${config.scene.reference.originalFileName}, ${config.scene.reference.mimeType}, ${config.scene.reference.width}x${config.scene.reference.height}).`
    : "";

  if (!sceneFragment) {
    return `No custom scene text has been provided.${reference}`;
  }

  return `${sceneFragment}.${reference}`;
}

function buildGraphicInstruction(config: GenerationConfig) {
  const fragment = clean(config.promptFragments.graphic);

  if (!fragment) {
    return null;
  }

  return `${fragment}. ${graphicSafeguardInstruction}`;
}

function buildOutputInstruction(config: GenerationConfig) {
  return [
    `Aspect ratio: ${config.output.aspectRatio.label}.`,
    `Requested count metadata: ${config.output.count.label}.`,
    `Quality intent: ${config.output.quality.label}.`,
    `Mode intent: ${config.output.mode.label}.`,
    "Keep image-level requirements editorial, readable, and production-oriented. Do not map these values to API parameters yet."
  ].join(" ");
}

function buildProhibitedBehavior(config: GenerationConfig) {
  const prohibited = [...baseProhibitedBehavior];

  if (config.composition.id === "C01" || config.composition.id === "C04") {
    prohibited.push("No visible human body.");
    prohibited.push("No mannequin.");
  }

  if (config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL") {
    prohibited.push("Do not create a strong continuous full-body invisible walking silhouette like SK02.");
    prohibited.push("Do not reconstruct a seamless shoulder-to-leg invisible person.");
    prohibited.push("Do not make every garment behave as if worn by one invisible model.");
    prohibited.push("No Hangul, Korean characters, or fake Korean visible text.");
  }

  if (config.composition.id === "C01") {
    prohibited.push("No visible person for the invisible-outfit composition.");
  }

  if (config.composition.id === "C02") {
    prohibited.push("No rigid ecommerce grid; keep the flat lay editorial.");
  }

  if (config.composition.id === "C05") {
    prohibited.push("Do not force a human model; the primary visual may be model-based or outfit-based.");
  }

  return prohibited.map((item) => `- ${item}`).join("\n");
}

function buildWarnings(config: GenerationConfig) {
  const warnings: string[] = [];
  const hasShoes = config.products.some((product) => product.slot.key === "shoes");

  if (!config.products.length) {
    warnings.push("No products uploaded.");
  }

  if ((config.composition.id === "C01" || config.composition.id === "C04") && !hasShoes) {
    warnings.push(`${config.composition.id} is selected but shoes are missing.`);
  }

  if (config.scene.id === "S06" && !clean(config.scene.customPrompt)) {
    warnings.push("Custom Scene is selected but custom prompt is empty.");
  }

  if (config.contentType.id === "couple") {
    warnings.push("Couple content type is selected, but V1 currently contains one outfit set.");
  }

  if (config.composition.id === "C03" && !config.scene.reference && config.scene.id === "S06" && !clean(config.scene.customPrompt)) {
    warnings.push("C03 Chair/Object Styling is selected without a scene reference or useful scene context.");
  }

  if (config.graphic.id !== "None" && !config.products.length) {
    warnings.push("Graphic overlay is selected without product references to annotate.");
  }

  return warnings;
}

function buildSummary(config: GenerationConfig) {
  const content = contentTypePhrase(config.contentType.id);
  const scene = config.scene.id === "S06" ? "custom scene" : config.scene.name;
  return `${content} ${config.composition.name.toLowerCase()} editorial in ${scene} with ${config.look.name.toLowerCase()} photographic treatment.`;
}

function buildRevisionInstruction(revision: GenerationPlanRevision | undefined) {
  if (!revision) {
    return null;
  }

  return [
    "REVISION REQUEST",
    "Keep all unmentioned elements unchanged.",
    `Revision type: ${revision.revisionType}.`,
    revision.instruction
  ].join("\n");
}

function buildSections(instructions: GenerationPlan["instructions"]): PromptSection[] {
  const baseSections: PromptSection[] = [
    { key: "task", heading: "01 TASK", body: instructions.task },
    { key: "productReferences", heading: "02 PRODUCT REFERENCES", body: instructions.productReferences },
    { key: "productFidelity", heading: "03 PRODUCT FIDELITY", body: instructions.productFidelity },
    { key: "composition", heading: "04 COMPOSITION", body: instructions.composition },
    { key: "physics", heading: "05 PHYSICS", body: instructions.physics },
    { key: "scene", heading: "06 SCENE", body: instructions.scene },
    { key: "camera", heading: "07 CAMERA", body: instructions.camera },
    { key: "lighting", heading: "08 LIGHTING", body: instructions.lighting },
    { key: "color", heading: "09 COLOR", body: instructions.color },
    { key: "contrast", heading: "10 CONTRAST", body: instructions.contrast },
    { key: "texture", heading: "11 TEXTURE", body: instructions.texture },
    { key: "mood", heading: "12 MOOD", body: instructions.mood },
    { key: "graphic", heading: "13 GRAPHIC OVERLAY", body: instructions.graphic }
  ];

  if (instructions.revision) {
    return [
      ...baseSections,
      { key: "revision", heading: "14 REVISION", body: instructions.revision },
      { key: "output", heading: "15 OUTPUT", body: instructions.output },
      { key: "prohibitedBehavior", heading: "16 NEGATIVE / PROHIBITED BEHAVIOR", body: instructions.prohibitedBehavior }
    ];
  }

  return [
    ...baseSections,
    { key: "output", heading: "14 OUTPUT", body: instructions.output },
    { key: "prohibitedBehavior", heading: "15 NEGATIVE / PROHIBITED BEHAVIOR", body: instructions.prohibitedBehavior }
  ];
}

function formatFinalPrompt(sections: PromptSection[]) {
  return sections
    .filter((section) => section.body)
    .map((section) => `[${section.heading}]\n${section.body}`)
    .join("\n\n");
}

export function compileGenerationPlan(config: GenerationConfig, options: { revision?: GenerationPlanRevision } = {}): GenerationPlan {
  const products = config.products.map((product) => ({
    slot: product.slot,
    assetId: product.assetId,
    assetType: product.assetType,
    originalFileName: product.originalFileName,
    mimeType: product.mimeType,
    width: product.width,
    height: product.height,
    publicUrl: product.publicUrl
  }));
  const instructions: GenerationPlan["instructions"] = {
    task: buildTaskInstruction(config),
    productReferences: buildProductReferences(products),
    productFidelity: config.productFidelity ? strictProductFidelityInstruction : lightProductReferenceInstruction,
    composition: buildCompositionInstruction(config),
    physics: config.promptFragments.physics,
    scene: buildSceneInstruction(config),
    camera: config.promptFragments.camera,
    lighting: config.promptFragments.lighting,
    color: config.promptFragments.color,
    contrast: config.promptFragments.contrast,
    texture: config.promptFragments.texture,
    mood: config.promptFragments.mood,
    graphic: buildGraphicInstruction(config),
    productConstraints: productPriorityInstruction,
    revision: buildRevisionInstruction(options.revision),
    output: buildOutputInstruction(config),
    prohibitedBehavior: buildProhibitedBehavior(config)
  };
  const sections = buildSections({
    ...instructions,
    productFidelity: `${productPriorityInstruction} ${instructions.productFidelity}`
  });

  return {
    version: generationPlanVersion,
    summary: buildSummary(config),
    taskType: "fashion_image_generation_prompt",
    contentType: config.contentType,
    skillOrigin: config.skillOrigin,
    products,
    instructions,
    revision: options.revision,
    warnings: buildWarnings(config),
    finalPrompt: formatFinalPrompt(sections)
  };
}

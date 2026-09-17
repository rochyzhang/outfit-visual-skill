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
    config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY"
      ? " Skill-specific modifier for SK01: preserve a realistic minimal flat lay close to the approved 01 visual reference. Arrange the outfit as naturally laid out on a floor, with casual but intentional placement, mild overlap, rhythm, visual hierarchy, believable contact, soft-edged grounded shadows, and small arrangement imperfections. Products should feel photographed together in one real still-life scene, not evenly separated, pasted-on, floating, or disconnected."
      : config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL"
      ? " Skill-specific modifier for SK02: use a clean editorial flat-lay outfit presentation with a tidier, more orderly, more controlled arrangement than SK01. Arrange the uploaded products on a light neutral studio surface so each major item reads clearly as its own product, with clear product separation, deliberate spacing, neat alignment, simple hierarchy, subtle contact shadows, and polished editorial negative space. Preserve one complete outfit relationship: top or outer as the upper visual anchor, trousers as the dominant lower-body item, shoes grouped naturally near the lower area, and bag placed nearby with minimal and deliberate overlap only when it improves hierarchy. Keep the layout shallow, flat, curated, and editorial rather than casually dropped, loosely scattered, or naturally messy. Keep it human-absent and clothing-only, with no invisible-body structure, mannequin, anatomy, body occupancy, human silhouette, walking pose, standing pose, or reclining body form."
      : config.skillOrigin?.id === "SK04_PROP_STYLING"
      ? " Skill-specific modifier for SK04: preserve prop-styling identity with one visually dominant hero chair or similarly simple hero prop. The outfit should interact naturally with that single anchor: garments may drape over or through the chair, trousers may fall from the seat, bags may hang from or rest against it, and shoes should ground beside it. Avoid simply placing independent products around a prop; the prop should organize the outfit spatially without distorting uploaded products. Do not add secondary furniture or prop clusters."
      : config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL"
      ? " Skill-specific modifier for SK06: use C04 only as a base for a flat 2D human-silhouette outfit editorial, not as SK02's clean separated studio flat lay and not as a product breakdown. Preserve one coherent head-to-toe outfit relationship: top or outer above bottom, bottom connected to the leg area, shoes near the implied feet, optional hat or glasses near the head position, bag at the shoulder or body side, and accessories associated with their natural styling positions. Flatness refers to depth, not incorrect scale: keep believable full-outfit human proportions, with the upper body, waist, bottom length, shoe size, bag scale, and accessories proportional to one fashion-body silhouette. Treat the complete outfit as the primary composition unit before scaling individual products, and maintain useful negative space around the complete look. Add a required callout for every major displayed product: small index number, short 1-3 word English product label derived conservatively from the supplied role or safe category, and a thin hand-drawn-style leader line pointing to the correct item. Place annotations in surrounding negative space; never cover product details. Prefer flattened garment presentation, front-facing or mildly angled layout, low depth, low perspective, graphic silhouette, restrained garment volume, clean overall outline, and complete outfit readability."
      : "";

  return `${config.promptFragments.composition}.${requirements}${skillModifier}`;
}

function buildSkillSceneModifier(config: GenerationConfig) {
  if (config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY") {
    return " Skill-specific scene fidelity for SK01: use the approved 01 visual reference as the style target: slightly cooler clean neutral-grey cement or concrete indoor floor, subtle natural floor texture, airy and clean but not empty-white studio backdrop, soft low-saturation natural daylight, real indoor still-life photography feel, and believable soft-edged contact shadows under products. Keep product colors faithful while cooling and cleaning only the environment. Avoid pure white cutout canvas, sterile ecommerce background, warm beige floor appearance, brownish-grey or muddy grey cast, dirty warm cement tone, yellow cast, overly contrasty floor texture, hard shadow, dramatic spotlight, side-angle fashion editorial feel, graphic poster layout, floating collage, or disconnected compositing.";
  }

  if (config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL") {
    return " Skill-specific scene fidelity for SK02: use a clean editorial flat-lay studio setting with its own 02 visual reference only. Prefer a clean white, soft grey, or very pale neutral studio floor/background with smooth or very light texture, polished editorial spacing, generous negative space, subtle contact shadows, and minimal visual distraction. Keep SK02 cleaner, tidier, more controlled, and more product-separated than SK01. Avoid borrowing SK01's casual concrete-floor arrangement language, cement-floor realism, strong concrete texture, warm beige cast, furniture, room architecture, lifestyle clutter, prop styling, catalog graphics, Korean callouts, pure white cutout canvas, sterile ecommerce grid, body-illusion staging, mannequin-like body structure, busy interiors, heavy warm backdrop, icy blue cast, clutter, or strong colored environmental cast.";
  }

  if (config.skillOrigin?.id === "SK04_PROP_STYLING") {
    return " Skill-specific scene fidelity for SK04: keep prop-styling identity with one visually dominant hero chair or simple prop, but move the environment to a cleaner, lighter grey-white indoor studio wall/floor. Prefer a simple light neutral backdrop, clean grey-white wall and floor, plain studio interior, soft diffused daylight, generous negative space, restrained premium materials, and one chair as the spatial anchor. Tiny styling details are acceptable only if they do not read as additional furniture. Avoid cement-wall or concrete-room feeling, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architecture, warm yellow room tone, orange cast, overly cozy mood, or prop-heavy storytelling.";
  }

  return "";
}

function buildSceneInstruction(config: GenerationConfig) {
  const sceneFragment = clean(config.promptFragments.scene);
  const reference = config.scene.reference
    ? ` Scene reference image is available (${config.scene.reference.originalFileName}, ${config.scene.reference.mimeType}, ${config.scene.reference.width}x${config.scene.reference.height}).`
    : "";
  const skillModifier = buildSkillSceneModifier(config);

  if (!sceneFragment) {
    return `No custom scene text has been provided.${skillModifier}${reference}`;
  }

  return `${sceneFragment}.${skillModifier}${reference}`;
}

function buildCameraInstruction(config: GenerationConfig) {
  const skillModifier =
    config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY"
      ? " Skill-specific camera for SK01: prefer true overhead / top-down photography, approximately 85-90 degree downward camera angle. Avoid side-angle fashion editorial framing."
      : "";

  return `${config.promptFragments.camera}${skillModifier}`;
}

function buildLightingInstruction(config: GenerationConfig) {
  const skillModifier =
    config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY"
      ? " Skill-specific lighting for SK01: soft low-saturation natural daylight, restrained contrast, soft-edged shadows, airy clean tone, no hard spotlight, no yellow cast."
      : config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL"
      ? " Skill-specific lighting for SK02: soft clean studio daylight, subtle contact shadows, low-to-medium contrast, polished editorial still-life mood, no hard spotlight, no heavy warm cast, no icy sterile cast."
      : config.skillOrigin?.id === "SK04_PROP_STYLING"
      ? " Skill-specific lighting for SK04: soft diffused daylight, gentle grounded shadows, restrained premium mood, no hard spotlight, no theatrical contrast."
      : "";

  return `${config.promptFragments.lighting}${skillModifier}`;
}

function buildColorInstruction(config: GenerationConfig) {
  const skillModifier =
    config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY"
      ? " Skill-specific color for SK01: slightly cooler clean neutral-grey concrete/cement environment, natural product color, low yellow warmth, no warm beige floor cast, no brownish-grey or muddy grey cast."
      : config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL"
      ? " Skill-specific color for SK02: clean pale neutral studio palette, white to soft grey surface, accurate product color, restrained warmth, not beige, not concrete-grey, not too icy, and not ecommerce-sterile."
      : config.skillOrigin?.id === "SK04_PROP_STYLING"
      ? " Skill-specific color for SK04: grey-white studio wall/floor palette, light neutral backdrop, clean cool-neutral interior tone, low saturation, no cement/concrete-room dominance, no warm yellow room tone, no orange cast, no vintage warm filter."
      : "";

  return `${config.promptFragments.color}${skillModifier}`;
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
    prohibited.push("Do not create a strong 3D invisible walking-body presentation.");
    prohibited.push("Do not use deep torso volume, inflated invisible shoulders, dramatic walking perspective, front/back leg depth, or realistic invisible-body anatomy.");
    prohibited.push("Do not scatter garments into independent product tiles, a full product breakdown, or a generic catalog grid.");
    prohibited.push("Do not lose the complete outfit relationship; SK06 must still read as one human-shaped look.");
    prohibited.push("Do not maximize each product independently or distort product scale; shoes, bag, accessories, upper body, and bottom must remain believable relative to the full outfit silhouette.");
    prohibited.push("Do not use long generated marketing copy, invented brand names, speculative product details, or annotation text that covers product details.");
    prohibited.push("No Hangul, Korean characters, or fake Korean visible text.");
  }

  if (config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY") {
    prohibited.push("Do not create a pure white cutout-on-background collage, floating graphic composition, sterile ecommerce white canvas, rigid product grid, pasted-on compositing, or disconnected evenly separated products.");
    prohibited.push("Do not remove the realistic indoor cement/concrete floor feeling, subtle ground texture, natural layered placement, grounded shadows, or editorial still-life photography quality.");
    prohibited.push("Do not use a warm beige floor appearance, brownish-grey or muddy grey cast, dirty warm cement tone, yellow cast, hard shadow, overly contrasty floor texture, dramatic spotlight, or side-angle fashion editorial feel.");
  }

  if (config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL") {
    prohibited.push("No visible human body, face, skin, person, or mannequin.");
    prohibited.push("Do not create an invisible-body structure, body-shaped outfit arrangement, 3D human-body structure, mannequin-like outfit body, implied anatomy, body occupancy, human silhouette, walking pose, standing pose, or reclining body form.");
    prohibited.push("Do not flatten SK02 into SK06's flat 2D human-silhouette presentation.");
    prohibited.push("Do not turn SK02 into SK04 prop styling, SK05 catalog graphics, SK06 Korean callout editorial, a product breakdown, or a rigid ecommerce grid.");
    prohibited.push("Do not make the arrangement casually layered, naturally messy, loosely scattered, excessively overlapping, thrown down, floating too far apart, or body-shaped; SK02 should feel clean, tidy, separated, controlled, and editorial without becoming a strict grid.");
    prohibited.push("Do not add furniture, chair props, decorative objects, strongly textured walls, room architecture, lifestyle clutter, dominant shadows, strong colored backdrops, elaborate set design, or clutter.");
    prohibited.push("Do not use cement-floor realism, strong concrete texture, warm beige dominance, warm yellow lighting, golden editorial warmth, heavy orange cast, icy blue cast, hard spotlight, or overly cozy room tone.");
  }

  if (config.skillOrigin?.id === "SK04_PROP_STYLING") {
    prohibited.push("Do not remove the meaningful hero prop/object relationship or convert SK04 into SK01 flat lay, SK03 product breakdown, or a generic product arrangement.");
    prohibited.push("Do not use cement-wall or concrete-room atmosphere; SK04 should read as a clean grey-white studio wall/floor environment.");
    prohibited.push("Do not add shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, busy architectural backgrounds, decorative architecture, or prop-heavy storytelling.");
    prohibited.push("Do not let prop fidelity override product fidelity; never distort uploaded products just to fit the furniture.");
    prohibited.push("Do not use warm yellow room tone, orange cast, overly cozy mood, vintage warm filter, hard spotlight, or theatrical contrast.");
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
    camera: buildCameraInstruction(config),
    lighting: buildLightingInstruction(config),
    color: buildColorInstruction(config),
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

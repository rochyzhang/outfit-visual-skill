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
      : config.skillOrigin?.id === "SK03_LOOK_BREAKDOWN"
      ? " Skill-specific modifier for SK03: preserve the approved look breakdown layout with one primary styled Look plus separate product/component breakdown panels or item placements. Use clean structured editorial hierarchy, clear item numbering, restrained sans-serif English labels, and enough negative space for every uploaded product. If recommended products such as a hat or bag are present, reflow and redistribute the breakdown layout so items do not crowd, overlap, cover each other, or squeeze the main Look. Keep SK03 distinct from SK01/SK02 flat-lay label systems, SK05 Japanese catalog pages, and SK06 hand-drawn Korean street callouts. Do not add free-floating handwritten words, lifestyle slogans, decorative phrases, extra book props, extra thumbnail photos, detail boxes, zoom-in frames, or unrelated mini images that are not part of the approved SK03 reference language."
      : config.skillOrigin?.id === "SK04_PROP_STYLING"
      ? " Skill-specific modifier for SK04: preserve prop-styling identity with one visually dominant hero chair or similarly simple hero prop. Interpret the SK04 reference as a chair-supported product display system: the chair is a styling prop, display support, flat structural support, and garment support; it is not a hidden torso, pelvis, hips, thighs, knees, calves, legs, seated body, standing body, or mannequin. The result should read as garments arranged on a chair as a fashion display, not as an invisible person sitting in the clothes. Human-referential reading is allowed only through garment order and outfit relationship, not body shape, human pose, or body posture. Garments must remain empty, unworn, non-inflated, and product-like. All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the chair, contact with the floor, or contact with other products; never from hidden human anatomy. Tops or inner tops may rest over the chair back, lie over the chair back, hang over the chair edge, or be softly supported by the chair while staying visibly empty, following fabric gravity with no chest volume, torso cavity, stretched shoulder anatomy, hidden torso, or worn-body tension. Bags may hang naturally from or rest against the chair as independent products. Trousers must be laid or draped from the chair seat or seat edge: the waistband may rest on the chair seat or edge, and the legs may drape downward naturally, collapse, flatten, twist, fold, or pool with folds created by fabric weight, denim stiffness, garment cut, gravity, chair contact, and natural bunching. Natural garment volume is allowed; human anatomical volume is not. Trousers must stay empty and must not form two clean anatomical leg tubes, inflated trouser legs, hidden thigh shapes, hidden knee shapes, calf volume, pelvis or hip anatomy, sitting-leg anatomy, or a seated-body pose. Shoes and hats should stay product-like near the chair or lower composition area, naturally grouped, and not aligned as invisible feet or forced into SK06 standing-pose logic. Avoid simply placing independent products around a prop; the prop should organize the outfit spatially without distorting uploaded products. Do not add secondary furniture, prop clusters, extra flat-lay mini images, detail boxes, thumbnails, books, magazines, visible body parts, face, skin, a full mannequin, hidden mannequin, chest volume, pelvis volume, hip volume, thigh volume, knee volume, calf volume, body-inflated garment tension, seated invisible-person structure, standing silhouette, or a strong 3D invisible-person effect."
      : config.skillOrigin?.id === "SK05_JAPANESE_CATALOG"
      ? " Skill-specific modifier for SK05: preserve a Japanese lifestyle magazine/catalog page language close to the approved 05 visual reference. Keep the main outfit composition dominant on a warm off-white paper-like page with calm editorial hierarchy, product descriptions integrated into the page, tasteful numbered product references when useful, side notes, generous spacing, and refined magazine typography. English should carry the primary product information, with only small restrained Japanese editorial accent text allowed. Typography must feel like a Japanese catalog/magazine page, not hand-drawn callouts. Do not create a vertical column of multiple product zoom/detail boxes, cropped close-up thumbnails, technical detail panels, spec-sheet modules, breakdown-board structure, extra book props, unrelated decorative mini photos, or extra slogans."
      : config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL"
      ? " Skill-specific modifier for SK06: use C04 only as a base for a flat outfit arranged in normal wearing order, not as SK02's clean separated studio flat lay, not as SK04 chair-supported display, not as SK05 magazine typography, and not as a product breakdown. Follow strict wearing-order arrangement logic: top or outer and any hat sit at the upper-body/head position; bottom is placed directly below with a believable waist-to-hem relationship; shoes sit at the bottom as the end of the outfit; both shoe toes must point left in one coordinated pose direction and visually continue the trouser-leg directions; if a hat is present, its brim or directional front should also face left. Bag sits as an accessory relative to the upper-body or shoulder area instead of floating as an isolated product tile. Preserve one coherent flat laid-out Look relationship before optimizing individual products. The overall outfit may suggest a standing person through order and placement only, but it must not simulate a standing body. Pose feeling may come from slight angle between top and trousers, subtle asymmetry, offset product placement, coordinated leg directions, bag position, and left-facing shoe/hat direction. Pose feeling must not come from body volume. Top, hat, trousers, bag, and shoes must remain laid out, staged, flat, empty, unworn, non-inflated, and product-like. All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the floor, or contact with other products; never from hidden human anatomy. The garments are not worn, do not contain an internal body, and must not look like a standing invisible model. Trousers must stay flat and empty with no hidden hips, pelvis, thigh anatomy, knee anatomy, calf anatomy, inflated leg tubes, or anatomy-shaped leg volume. Shoes are staged products, not worn feet. Treat the complete outfit as the primary composition unit before scaling individual products, maintain useful negative space around the complete look, and keep shoe direction coordinated left. Add a required callout for every major displayed product: small index number, short 1-3 word English product label derived conservatively from the supplied role or safe category, and a white hand-drawn-style leader line pointing to the correct item. Place annotations in surrounding negative space; never cover product details. Prefer flattened garment presentation, low depth, low perspective, graphic silhouette, restrained natural garment volume, clean overall outline, complete outfit readability, and more pose energy than a simple straight flat lay without becoming worn-body styling."
      : "";

  if (config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL" && skillModifier) {
    return `${skillModifier.trim()}.${requirements}`;
  }

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
    return " Skill-specific scene fidelity for SK04: keep prop-styling identity with one visually dominant hero chair or simple prop, and restore the approved clean premium cool grey-white studio wall/floor. Prefer a simple light neutral backdrop, seamless quiet wall/floor relationship, clean grey-white wall and floor, plain empty studio interior, soft even ambient studio light, diffuse lighting, very low directional-light drama, restrained contrast, minimal shadow pattern, generous negative space, restrained premium materials, and one chair as the spatial anchor. Tiny styling details are acceptable only if they do not read as additional furniture. Avoid rough cement room feeling, industrial concrete-wall dominance, visible sunbeam, window-light streak, diagonal light patch, dramatic floor shadow, warm sunlight, editorial cinematic side light, sunlight entering from a window, spotlight, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architecture, warm yellow room tone, orange cast, warm beige, overly cozy mood, or prop-heavy storytelling.";
  }

  if (config.skillOrigin?.id === "SK05_JAPANESE_CATALOG") {
    return " Skill-specific scene fidelity for SK05: use a warm off-white, soft paper-like Japanese magazine/catalog page environment with calm negative space, refined editorial margins, and a quiet lifestyle catalog atmosphere. The main outfit must remain dominant. Avoid technical product-detail boards, right-side columns of repeated zoom boxes, cropped close-up panels, spec-sheet layouts, sterile ecommerce backgrounds, or generic Japanese model photography.";
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
      ? " Skill-specific lighting for SK04: soft even ambient studio light, diffuse lighting, restrained premium mood, minimal shadow pattern, very low directional-light drama, no visible sunbeam, no window-light streak, no diagonal light patch, no dramatic floor shadow, no warm sunlight, no hard spotlight, no theatrical contrast, no editorial cinematic side light."
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
      ? " Skill-specific color for SK04: cool grey-white studio wall/floor palette, light neutral backdrop, clean slightly cool-neutral interior tone, low saturation, no cement/concrete-room dominance, no warm yellow room tone, no warm beige, no orange cast, no vintage warm filter."
      : "";

  return `${config.promptFragments.color}${skillModifier}`;
}

function buildSkillGraphicModifier(config: GenerationConfig) {
  if (config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY") {
    return "Skill-specific graphic for SK01: add lightweight product information annotations using thin arrows or leader lines plus short English labels in Title Case. Restore the richer approved 01 annotation feeling: slightly more descriptive than bare category names, with optional short supporting descriptors such as Knit Polo / Soft Textured Knit, Burgundy Bag / Glossy Soft Leather, Wide Trousers / Relaxed Denim, or Runner Sneakers / Retro Low Profile. The annotation style should feel direct, casual, lively, and lifestyle still-life explanatory, while the image remains realistic flat-lay photography rather than an information poster. Place labels in negative space, point each arrow to the correct product, and never cover product-defining details. Do not use all-caps for every product name; do not add a large poster headline, complex typography hierarchy, brand logos, URLs, prices, long marketing copy, or non-English text.";
  }

  if (config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL") {
    return "Skill-specific graphic for SK02: add a clean editorial outfit information layout. A restrained top title such as OUTFIT NOTES, EDITED LOOK, or MONTHLY OUTFIT may appear, with systematic product information labels around the items. Use a clearer text hierarchy than SK01: category or neutral product name as the primary line, optional short description as the secondary line, and simple thin leader lines pointing to the correct products. Keep all visible text in English, concise, and generic; do not copy reference-image brand names, website addresses, logos, months, or slogans. The information layer should be polished and controlled, but SK02 must not become SK03 product breakdown, SK05 catalog layout, or SK06 Korean callout editorial.";
  }

  if (config.skillOrigin?.id === "SK03_LOOK_BREAKDOWN") {
    return "Skill-specific graphic for SK03: use the approved look breakdown typography only: clean structured editorial layout, restrained sans-serif English labels, small item numbers, thin dividers or leader lines, and product/component captions placed in an orderly breakdown system. Keep visible text limited to product roles, item names, and short factual descriptions. Do not add free-floating handwritten words, slogans such as Daily Outfit, decorative motivational phrases, SK01/SK02 arrow-label styling, SK05 magazine typography, SK06 white hand-drawn callouts, extra book props, unrelated mini images, zoom detail boxes, thumbnails, or enlarged product detail frames.";
  }

  if (config.skillOrigin?.id === "SK04_PROP_STYLING") {
    return "Skill-specific graphic for SK04: add only one small top information row made of concise English product notes, optionally grouped by item. The top row is supplemental and must not overpower the prop-styling image. Use restrained editorial typography with no large poster headline, no extra flat-lay product image row, no thumbnails, no detail boxes, no zoom frames, no book props, no URLs, no brand logos, no prices, no marketing slogan, and no non-English text. Product notes must remain accurate to the uploaded items and must not cover the outfit or hero prop.";
  }

  if (config.skillOrigin?.id === "SK05_JAPANESE_CATALOG") {
    return "Skill-specific graphic for SK05: create a Japanese lifestyle magazine/catalog page layout with elegant magazine typography, product descriptions integrated into the page, restrained numbered product references, side notes, refined margins, and warm editorial hierarchy. English should be the primary informational language; a small amount of short Japanese editorial accent text is allowed as a decorative magazine element. Japanese text must be limited, visually integrated, and not dominant. The product identification style should feel like the approved Japanese catalog reference, not handwritten callouts. Do not create hand-drawn text, white sketch arrows, SK06-style handwritten labels, large blocks of Japanese, unreadable Japanese-like noise, fake brand logos, URLs, extra slogans, book props, a vertical product zoom/detail-box column, multiple cropped close-up thumbnails, technical product-detail panels, or a spec-sheet feeling.";
  }

  if (config.skillOrigin?.id === "SK06_KOREAN_STREET_EDITORIAL") {
    return "Skill-specific graphic for SK06: use only the approved Korean street editorial graphic language: white hand-drawn arrows, white hand-drawn product numbers, relaxed handwritten English product labels, and a casual independent-brand sketch tone. Keep labels short and product-specific. Do not use SK05 Japanese magazine serif typography, printed catalog columns, product description paragraphs, detail boxes, thumbnails, book props, URLs, logos, slogans, Hangul, Korean characters, or fake Korean text.";
  }

  return "";
}

function buildGraphicInstruction(config: GenerationConfig) {
  const fragment = clean(config.promptFragments.graphic);
  const skillModifier = buildSkillGraphicModifier(config);

  if (!fragment && !skillModifier) {
    return null;
  }

  return [fragment ? `${fragment}.` : "", skillModifier, graphicSafeguardInstruction].filter(Boolean).join(" ");
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
    prohibited.push("Do not create a standing invisible-person, worn-body, or strong 3D invisible walking-body presentation.");
    prohibited.push("Do not make garments look worn by invisible feet, legs, torso, shoulders, hips, pelvis, or body; no internal body volume, chest volume caused by hidden torso, chest cavity, inflated shoulders, pelvis volume, hip anatomy, thigh anatomy, knee anatomy, calf anatomy, front/back leg depth, inflated trouser legs, clothing tension caused by a hidden body, or realistic invisible-body anatomy.");
    prohibited.push("Do not scatter garments into independent product tiles, a full product breakdown, or a generic catalog grid.");
    prohibited.push("Do not create random flat-lay scattering; do not place products decoratively without wearing-order logic.");
    prohibited.push("Do not lose the complete outfit relationship; SK06 must still read as flat products arranged in the order a person would wear them.");
    prohibited.push("Do not break the top-to-trouser-to-shoe hierarchy; the top must sit above the trousers, trousers directly below, and shoes at the bottom as coordinated staged products.");
    prohibited.push("Do not place the bag as a random isolated product; it should read as an accessory near the upper-body or shoulder side of the flat staged look.");
    prohibited.push("Do not reduce SK06 to a rigid straight-line flat lay or simple product flat lay; the flat staged outfit needs clear wearing-order hierarchy, coordinated trouser direction, coordinated shoe direction, and subtle asymmetry without body volume.");
    prohibited.push("Do not make shoes point in random opposing directions; shoe toes should point in the same general direction within the flat outfit composition.");
    prohibited.push("Do not point SK06 shoes to the right or in mixed directions; both shoe toes should point left, and any hat brim or directional hat front should face the same leftward direction when a hat is present.");
    prohibited.push("Do not detach shoes from the wearing-order relationship; shoes should visually continue the trouser-leg directions while remaining staged products, not invisible feet.");
    prohibited.push("Do not maximize each product independently or distort product scale; shoes, bag, accessories, upper body, and bottom must remain believable relative to the full outfit silhouette.");
    prohibited.push("Do not use long generated marketing copy, invented brand names, speculative product details, or annotation text that covers product details.");
    prohibited.push("Do not use SK05 Japanese magazine typography, printed catalog columns, serif magazine product descriptions, detail boxes, thumbnails, book props, decorative slogans, or non-handwritten label styles in SK06.");
    prohibited.push("No Hangul, Korean characters, or fake Korean visible text.");
  }

  if (config.skillOrigin?.id === "SK01_MINIMAL_FLAT_LAY") {
    prohibited.push("Do not create a pure white cutout-on-background collage, floating graphic composition, sterile ecommerce white canvas, rigid product grid, pasted-on compositing, or disconnected evenly separated products.");
    prohibited.push("Do not remove the realistic indoor cement/concrete floor feeling, subtle ground texture, natural layered placement, grounded shadows, or editorial still-life photography quality.");
    prohibited.push("Do not use a warm beige floor appearance, brownish-grey or muddy grey cast, dirty warm cement tone, yellow cast, hard shadow, overly contrasty floor texture, dramatic spotlight, or side-angle fashion editorial feel.");
    prohibited.push("Do not turn SK01 annotations into a poster title, dense information layout, SK02-style systematic editorial label grid, SK03 breakdown poster, or SK04 chair/prop scene.");
    prohibited.push("Do not use all-caps for every SK01 product name; prefer Title Case labels with short optional descriptors.");
  }

  if (config.skillOrigin?.id === "SK02_INVISIBLE_EDITORIAL") {
    prohibited.push("No visible human body, face, skin, person, or mannequin.");
    prohibited.push("Do not create an invisible-body structure, body-shaped outfit arrangement, 3D human-body structure, mannequin-like outfit body, implied anatomy, body occupancy, human silhouette, walking pose, standing pose, or reclining body form.");
    prohibited.push("Do not flatten SK02 into SK06's flat 2D human-silhouette presentation.");
    prohibited.push("Do not turn SK02 into SK04 prop styling, SK05 catalog graphics, SK06 Korean callout editorial, a product breakdown, or a rigid ecommerce grid.");
    prohibited.push("Do not make the arrangement casually layered, naturally messy, loosely scattered, excessively overlapping, thrown down, floating too far apart, or body-shaped; SK02 should feel clean, tidy, separated, controlled, and editorial without becoming a strict grid.");
    prohibited.push("Do not add furniture, chair props, decorative objects, strongly textured walls, room architecture, lifestyle clutter, dominant shadows, strong colored backdrops, elaborate set design, or clutter.");
    prohibited.push("Do not use cement-floor realism, strong concrete texture, warm beige dominance, warm yellow lighting, golden editorial warmth, heavy orange cast, icy blue cast, hard spotlight, or overly cozy room tone.");
    prohibited.push("Do not copy brand names, website URLs, logos, months, or slogans from reference images; use only generic English product labels and concise neutral descriptions. Do not turn SK02 into SK03 product breakdown, SK05 catalog typography, or SK06 Korean callout editorial.");
  }

  if (config.skillOrigin?.id === "SK03_LOOK_BREAKDOWN") {
    prohibited.push("Do not lose the approved SK03 look breakdown structure: one primary styled Look plus separate product/component breakdown with clean hierarchy.");
    prohibited.push("Do not crowd, squeeze, overlap, or cover products when optional items such as hats or bags are present; reflow the layout and preserve negative space.");
    prohibited.push("Do not add free-floating handwritten words, decorative slogans, motivational phrases, Daily Outfit-style text, extra books, unrelated mini images, detail boxes, zoom frames, thumbnails, or enlarged close-up panels.");
    prohibited.push("Do not use SK01/SK02 arrow-label styling, SK05 Japanese catalog typography, or SK06 white hand-drawn callouts in SK03.");
  }

  if (config.skillOrigin?.id === "SK04_PROP_STYLING") {
    prohibited.push("Do not remove the meaningful hero prop/object relationship or convert SK04 into SK01 flat lay, SK03 product breakdown, or a generic product arrangement.");
    prohibited.push("Do not use cement-wall or concrete-room atmosphere; SK04 should read as a clean grey-white studio wall/floor environment.");
    prohibited.push("Do not use visible sunbeams, window-light streaks, diagonal light patches, dramatic floor shadows, warm sunlight, spotlight, editorial cinematic side light, or warm afternoon light; SK04 lighting should be soft even ambient studio light.");
    prohibited.push("Do not add shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, busy architectural backgrounds, decorative architecture, or prop-heavy storytelling.");
    prohibited.push("Do not let prop fidelity override product fidelity; never distort uploaded products just to fit the furniture.");
    prohibited.push("Do not use warm yellow room tone, orange cast, overly cozy mood, vintage warm filter, hard spotlight, or theatrical contrast.");
    prohibited.push("Do not show a real human, face, skin, full mannequin, hidden mannequin, strong 3D invisible-person body, invisible seated person, seated body pose, or SK06-style standing silhouette; SK04 may be human-referential only through garment order and chair-supported display logic, not body shape.");
    prohibited.push("Do not make the chair behave like a hidden torso, pelvis, thighs, legs, seated body, standing body, or mannequin.");
    prohibited.push("Do not make tops look worn by an invisible seated person; no chest volume caused by hidden torso, torso cavity, stretched shoulder anatomy, hidden body support, or worn-body tension.");
    prohibited.push("Do not inflate trousers with invisible pelvis, hip, thigh, knee, or calf anatomy; no rounded leg tubes, inflated trouser legs, sitting-leg anatomy, seated-body pose encoded into trousers, two clean anatomical leg tubes, or trouser legs shaped like someone is inside them. Natural garment volume and 3D fabric folds from gravity, denim stiffness, garment cut, chair contact, and bunching are allowed; human anatomical volume is not.");
    prohibited.push("Do not make bags look carried by an invisible person, and do not position shoes as invisible feet or force SK06 standing-pose shoe logic into SK04.");
    prohibited.push("Do not let the top information row become a large poster headline or cover the products.");
    prohibited.push("Do not add flat-lay mini images, product thumbnails, detail boxes, zoom frames, books, magazines, extra small reference pictures, or SK03/SK05 breakdown graphics; SK04 top graphics should be text only.");
  }

  if (config.skillOrigin?.id === "SK05_JAPANESE_CATALOG") {
    prohibited.push("Do not add a vertical column of multiple product zoom/detail boxes, cropped close-up thumbnails, technical detail panels, spec-sheet modules, or product breakdown-board structure.");
    prohibited.push("Do not replace the Japanese magazine/catalog page with generic Japanese model photography, ecommerce product tiles, or technical product-detail pages.");
    prohibited.push("Do not generate large blocks of Japanese text, unreadable Japanese-like noise, fake brand names, URLs, logos, or text that covers product details.");
    prohibited.push("Do not use hand-drawn typography, white sketch arrows, SK06 handwritten callouts, extra slogans, book props, unrelated decorative objects, detail boxes, thumbnails, or close-up frames in SK05.");
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

export const strictProductFidelityInstruction = [
  "The uploaded product images are authoritative visual references.",
  "Preserve each uploaded item's original silhouette, proportions, construction, fabric/material appearance, color, print, pattern, visible logo, hardware, trims, and distinctive design details.",
  "Do not redesign garments, replace products with similar alternatives, invent logos, invent prints, change pocket structure, change seams, or alter product proportions unnecessarily.",
  "Products may only be repositioned, folded, draped, suspended, or arranged as required by the selected composition.",
  "Preserve realistic relative scale between garments."
].join(" ");

export const lightProductReferenceInstruction =
  "Uploaded references define the intended outfit. Keep the outfit recognizably based on those references, but do not apply the strict preservation block.";

export const productPriorityInstruction =
  "Priority order: PRODUCT FIDELITY > COMPOSITION > SCENE > STYLE > GRAPHIC. Scene, look, and graphic styling must never override garment fidelity or redesign uploaded products.";

export const graphicSafeguardInstruction =
  "Typography and graphic annotations must not obscure important garment details. Do not invent prices, discount percentages, brand logos, or product names. All visible text, labels, annotations, captions, and handwritten notes in the generated image must be in English only. Do not use Korean, Hangul, Chinese, Japanese, or other non-English text unless explicitly requested by the user.";

export const baseProhibitedBehavior = [
  "No unintended garment redesign.",
  "No missing uploaded core garments.",
  "No duplicated garment pieces unless the composition requires it.",
  "No extra logos or prints.",
  "No distorted shoes.",
  "No impossible fabric anatomy.",
  "No hanger unless the selected composition requires it.",
  "No ecommerce grid when editorial layout is requested."
];

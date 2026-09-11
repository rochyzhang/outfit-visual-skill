import { assertUniqueIds } from "./assertions";
import type { CompositionPreset } from "@/types/domain";

export const compositionPresets = [
  {
    id: "C01",
    name: "Floating Outfit",
    shortDescription: "Items arranged as if worn by an invisible model.",
    compositionPrompt:
      "editorial fashion still life, complete outfit arranged as if worn by an invisible person, accessories arranged naturally, slight asymmetry, full outfit visible",
    physicsPrompt:
      "realistic garment gravity, natural sleeve and trouser positioning, shoes correspond to implied feet, no impossible floating distortions",
    cameraPrompt: "straight or very slightly elevated editorial view, full outfit clearly visible",
    requirements: ["no visible body", "no mannequin", "no hanger unless explicitly requested"],
    tags: ["invisible-outfit", "editorial", "full-look"],
    supportsCouple: false,
    supportsModel: false,
    supportsGraphicOverlay: true
  },
  {
    id: "C02",
    name: "Full Outfit Flat Lay",
    shortDescription: "Complete look from above.",
    compositionPrompt:
      "top-down fashion flat lay, complete outfit arranged on a surface, top above bottoms, shoes positioned naturally near lower body area, accessories casually distributed, editorial rather than ecommerce-grid styling, full outfit visible",
    physicsPrompt: "realistic garment folds, natural fabric relaxation on the surface, not perfectly symmetrical",
    cameraPrompt: "true or near top-down view",
    requirements: ["full outfit visible"],
    tags: ["flat-lay", "top-down", "editorial"],
    supportsCouple: true,
    supportsModel: false,
    supportsGraphicOverlay: true
  },
  {
    id: "C03",
    name: "Chair / Object Styling",
    shortDescription: "Styled around a prop.",
    compositionPrompt:
      "conceptual fashion still life, outfit naturally arranged on or around a chair or object, slightly surreal but physically believable, minimal editorial environment",
    physicsPrompt:
      "garments draped according to realistic implied body posture, gravity-driven folds, believable fabric contact with object surfaces",
    cameraPrompt: "editorial still-life viewpoint with the styled object and outfit clearly readable",
    requirements: ["object or prop may be required or inferred from scene later"],
    tags: ["object", "chair", "still-life"],
    supportsCouple: false,
    supportsModel: false,
    supportsGraphicOverlay: true
  },
  {
    id: "C04",
    name: "Dynamic Invisible Outfit",
    shortDescription: "Body shape implied in motion.",
    compositionPrompt:
      "complete outfit shaped into the silhouette of an invisible person in motion, walking or moving posture, dynamic garment articulation, arms and legs implied through clothes, energetic but controlled editorial composition",
    physicsPrompt:
      "realistic folds caused by movement, shoes aligned with implied feet, believable garment tension and motion",
    cameraPrompt: "fashion editorial view that keeps the moving outfit silhouette clear",
    requirements: ["no visible person", "no mannequin"],
    tags: ["dynamic", "motion", "invisible-outfit"],
    supportsCouple: false,
    supportsModel: false,
    supportsGraphicOverlay: true
  },
  {
    id: "C05",
    name: "Model + Item Breakdown",
    shortDescription: "Look plus product details.",
    compositionPrompt:
      "fashion editorial catalog composition, one primary styled look, separate clothing pieces and accessories displayed around or beside the primary look, clear visual hierarchy, generous negative space, editorial product breakdown layout",
    physicsPrompt:
      "displayed items retain believable folds, proportions and placement; primary visual may be model-based or outfit-based",
    cameraPrompt: "catalog editorial framing with readable primary look and surrounding item details",
    requirements: ["do not force a human model", "support model-based or outfit-based primary visual"],
    tags: ["catalog", "breakdown", "editorial"],
    supportsCouple: true,
    supportsModel: true,
    supportsGraphicOverlay: true
  }
] satisfies CompositionPreset[];

assertUniqueIds(compositionPresets, "compositionPresets");

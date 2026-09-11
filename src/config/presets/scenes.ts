import { assertUniqueIds } from "./assertions";
import type { ScenePreset } from "@/types/domain";

export const scenePresets = [
  {
    id: "S01",
    name: "White Studio",
    shortDescription: "Clean warm-white seamless studio.",
    background: "clean warm-white seamless studio environment with large negative space",
    surface: "minimal continuous studio surface",
    environment: "no distracting architectural details",
    promptFragment:
      "clean warm-white seamless studio environment, minimal continuous surface, large negative space, no distracting architectural details",
    tags: ["studio", "white", "minimal"],
    visual: "plain"
  },
  {
    id: "S02",
    name: "Dusty Sage",
    shortDescription: "Muted sage editorial environment.",
    background: "muted dusty sage green seamless studio background",
    surface: "clean continuous surface",
    environment: "quiet minimal editorial environment with large negative space",
    promptFragment:
      "muted dusty sage green seamless studio background, quiet minimal editorial environment, clean continuous surface, large negative space",
    tags: ["studio", "sage", "minimal"],
    visual: "sage"
  },
  {
    id: "S03",
    name: "Grey Concrete",
    shortDescription: "Minimal concrete studio interior.",
    background: "light grey concrete studio interior",
    surface: "subtle concrete surface texture",
    environment: "minimal industrial environment with quiet architectural context",
    promptFragment:
      "light grey concrete studio interior, subtle concrete surface texture, minimal industrial environment, quiet architectural context",
    tags: ["concrete", "industrial", "grey"],
    visual: "concrete"
  },
  {
    id: "S04",
    name: "Burgundy Fabric",
    shortDescription: "Deep textile editorial backdrop.",
    background: "deep burgundy textile backdrop",
    surface: "soft fabric surface",
    environment: "minimal editorial still-life environment with subtle textile folds where physically appropriate",
    promptFragment:
      "deep burgundy textile backdrop, soft fabric surface, minimal editorial still-life environment, subtle textile folds where physically appropriate",
    tags: ["fabric", "burgundy", "editorial"],
    visual: "burgundy"
  },
  {
    id: "S05",
    name: "Warm Off-white",
    shortDescription: "Creamy neutral studio environment.",
    background: "warm off-white studio environment with slightly creamy neutral background",
    surface: "soft paper-like or plaster-like surface",
    environment: "minimal editorial space",
    promptFragment:
      "warm off-white studio environment, slightly creamy neutral background, minimal editorial space, soft paper-like or plaster-like surface",
    tags: ["studio", "warm", "neutral"],
    visual: "warm"
  },
  {
    id: "S06",
    name: "Custom",
    shortDescription: "User-defined scene text.",
    background: "user-defined",
    surface: "user-defined",
    environment: "user-defined",
    promptFragment: null,
    tags: ["custom"],
    visual: "plain"
  }
] satisfies ScenePreset[];

assertUniqueIds(scenePresets, "scenePresets");

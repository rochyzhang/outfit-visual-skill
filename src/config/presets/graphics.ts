import { assertUniqueIds } from "./assertions";
import type { GraphicPreset } from "@/types/domain";

export const graphicPresets = [
  {
    id: "None",
    name: "None",
    shortDescription: "No graphic overlay.",
    promptFragment: null,
    tags: ["none"]
  },
  {
    id: "G01",
    name: "Minimal Label",
    shortDescription: "Restrained editorial annotations.",
    promptFragment:
      "minimal fashion editorial typography, small item numbers, thin restrained sans-serif labeling, subtle product annotations, large negative space",
    tags: ["minimal", "label", "editorial"]
  },
  {
    id: "G02",
    name: "Korean Street",
    shortDescription: "Casual streetwear notes.",
    promptFragment:
      "Korean independent streetwear and Seoul editorial graphic language, English-only editorial annotations and labels, concise handwritten-style English notes, item numbers, restrained logo placement, youth editorial feeling, do not use Hangul or Korean-language text, no copyrighted brand logos",
    tags: ["korean", "streetwear", "annotation"]
  },
  {
    id: "G03",
    name: "Commercial Poster",
    shortDescription: "Campaign-style hierarchy.",
    promptFragment:
      "bold fashion campaign layout, large headline area, clear promotional hierarchy, condensed sans-serif editorial typography, simple geometric information structure, no sale percentages unless requested",
    tags: ["poster", "commercial", "campaign"]
  },
  {
    id: "G04",
    name: "Japanese Catalog",
    shortDescription: "Precise catalog labeling.",
    promptFragment:
      "Japanese magazine/catalog typography with English as the primary product-information language, limited short Japanese editorial accent text when appropriate, precise alignment, minimal black typography, generous white space, quiet editorial layout, no product zoom/detail-box column",
    tags: ["japanese", "catalog", "technical"]
  }
] satisfies GraphicPreset[];

assertUniqueIds(graphicPresets, "graphicPresets");

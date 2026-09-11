import { assertUniqueIds } from "./assertions";
import type { LookPreset } from "@/types/domain";

export const lookPresets = [
  {
    id: "L01",
    name: "Dusty Sage",
    shortDescription: "Soft green editorial tone.",
    lighting: "soft diffused studio lighting",
    colorPalette: "low saturation, subtle muted sage-green cast, restrained cool-neutral palette",
    contrast: "matte, soft contrast",
    texture: "fine analog film grain, subtle tactile texture",
    mood: "quiet Korean streetwear editorial, slightly vintage, calm",
    promptFragment:
      "soft diffused studio lighting, low saturation, subtle muted sage-green cast, restrained cool-neutral palette, matte soft contrast, fine analog film grain, quiet Korean streetwear editorial mood",
    tags: ["sage", "soft", "editorial"],
    visual: "sage"
  },
  {
    id: "L02",
    name: "Clean White",
    shortDescription: "Bright, precise studio light.",
    lighting: "high-key diffused studio lighting, soft natural shadows",
    colorPalette: "neutral white balance, accurate garment colors",
    contrast: "clean, low-to-medium contrast",
    texture: "very subtle photographic texture, avoid sterile CGI cleanliness",
    mood: "minimal Japanese fashion catalog, precise, clean",
    promptFragment:
      "high-key diffused studio lighting, soft natural shadows, neutral white balance, accurate garment colors, clean low-to-medium contrast, very subtle photographic texture, minimal Japanese fashion catalog mood",
    tags: ["clean", "white", "catalog"],
    visual: "plain"
  },
  {
    id: "L03",
    name: "Burgundy Editorial",
    shortDescription: "Deep fabric and contrast.",
    lighting: "warm directional editorial light, soft falloff",
    colorPalette: "warm highlights, rich muted tonal response",
    contrast: "deeper but soft shadows",
    texture: "subtle analog film grain",
    mood: "premium tactile fashion editorial, nostalgic, cinematic",
    promptFragment:
      "warm directional editorial light, soft falloff, warm highlights, rich muted tonal response, deeper but soft shadows, subtle analog film grain, premium tactile nostalgic fashion editorial mood",
    tags: ["warm", "cinematic", "editorial"],
    visual: "burgundy"
  },
  {
    id: "L04",
    name: "Concrete Grey",
    shortDescription: "Neutral texture, cooler light.",
    lighting: "soft natural-window style light, overcast daylight quality",
    colorPalette: "cool neutral palette, slightly desaturated",
    contrast: "soft natural contrast",
    texture: "subtle film grain",
    mood: "quiet industrial, city-boy, minimal Japanese lifestyle editorial",
    promptFragment:
      "soft natural-window style light, overcast daylight quality, cool neutral slightly desaturated palette, soft natural contrast, subtle film grain, quiet industrial city-boy lifestyle editorial mood",
    tags: ["grey", "industrial", "lifestyle"],
    visual: "concrete"
  },
  {
    id: "L05",
    name: "Warm Vintage",
    shortDescription: "Soft warmth and gentle grain.",
    lighting: "soft low-contrast light",
    colorPalette: "warm off-white highlights, slightly faded earthy tones",
    contrast: "gentle, faded",
    texture: "fine analog grain, subtle print or paper feeling",
    mood: "1970s to 1990s fashion catalog, warm, restrained nostalgia",
    promptFragment:
      "soft low-contrast light, warm off-white highlights, slightly faded earthy tones, gentle faded contrast, fine analog grain, subtle print or paper feeling, restrained vintage fashion catalog mood",
    tags: ["warm", "vintage", "catalog"],
    visual: "warm"
  },
  {
    id: "L06",
    name: "Retro Commercial",
    shortDescription: "Catalog polish with color.",
    lighting: "soft commercial editorial lighting",
    colorPalette: "muted pastel and faded commercial palette",
    contrast: "low-to-medium printed contrast",
    texture: "paper grain, subtle halftone or aged print texture",
    mood: "retro fashion advertising, nostalgic commercial campaign",
    promptFragment:
      "soft commercial editorial lighting, muted pastel and faded commercial palette, low-to-medium printed contrast, paper grain, subtle halftone aged print texture, retro fashion advertising mood",
    tags: ["retro", "commercial", "poster"],
    visual: "retro"
  }
] satisfies LookPreset[];

assertUniqueIds(lookPresets, "lookPresets");

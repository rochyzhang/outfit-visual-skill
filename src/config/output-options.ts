import type { AspectRatio, OutputCount, OutputMode, OutputOption, OutputQuality } from "@/types/domain";

export const aspectRatioOptions = [
  { value: "3:4", label: "3:4" },
  { value: "4:5", label: "4:5" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" }
] satisfies OutputOption<AspectRatio>[];

export const countOptions = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 4, label: "4" }
] satisfies OutputOption<OutputCount>[];

export const qualityOptions = [
  { value: "draft", label: "Draft" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" }
] satisfies OutputOption<OutputQuality>[];

export const modeOptions = [
  { value: "single", label: "Single" },
  { value: "variations", label: "Variations" },
  { value: "series", label: "Series" }
] satisfies OutputOption<OutputMode>[];

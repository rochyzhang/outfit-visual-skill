import type { OutfitSlotDefinition } from "@/types/domain";

export const outfitSlotDefinitions = [
  { key: "hat", label: "Hat", category: "head", order: 1, optional: true },
  { key: "glasses", label: "Glasses", category: "head", order: 2, optional: true },
  { key: "neck", label: "Neck", category: "accessory", order: 3, optional: true },
  { key: "inner", label: "Inner", category: "upper", order: 4, optional: true },
  { key: "top", label: "Top", category: "upper", order: 5, optional: true },
  { key: "outer", label: "Outer", category: "upper", order: 6, optional: true },
  { key: "bottom", label: "Bottom", category: "lower", order: 7, optional: true },
  { key: "socks", label: "Socks", category: "footwear", order: 8, optional: true },
  { key: "shoes", label: "Shoes", category: "footwear", order: 9, optional: true },
  { key: "bag", label: "Bag", category: "carry", order: 10, optional: true },
  { key: "accessory01", label: "Accessory 01", category: "accessory", order: 11, optional: true },
  { key: "accessory02", label: "Accessory 02", category: "accessory", order: 12, optional: true },
  { key: "prop01", label: "Prop 01", category: "prop", order: 13, optional: true },
  { key: "prop02", label: "Prop 02", category: "prop", order: 14, optional: true }
] satisfies OutfitSlotDefinition[];

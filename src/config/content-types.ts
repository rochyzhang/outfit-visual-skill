import type { ContentTypeOption } from "@/types/domain";

export const contentTypes = [
  { id: "men", label: "MEN" },
  { id: "genderless", label: "GENDERLESS" },
  { id: "couple", label: "COUPLE" }
] satisfies ContentTypeOption[];

export type PromptQAStatus = "pass" | "warning" | "fail";

export type PromptQAIssueSeverity = "info" | "warning" | "error";

export type PromptQAIssueCode =
  | "SCENE_LOOK_CONFLICT"
  | "DUPLICATE_STYLE_WEIGHT"
  | "DUPLICATE_INSTRUCTION"
  | "GRAPHIC_OVERRIDES_COMPOSITION"
  | "GRAPHIC_CONTENT_INVENTION"
  | "PRODUCT_FIDELITY_CONFLICT"
  | "EMPTY_REVISION"
  | "REVISION_SCOPE_CONFLICT"
  | "NO_PRODUCTS"
  | "MISSING_CORE_PRODUCT"
  | "COMPOSITION_REQUIREMENT_MISMATCH"
  | "SCENE_RESPONSIBILITY_VIOLATION"
  | "LOOK_RESPONSIBILITY_VIOLATION"
  | "OVERLONG_FINAL_PROMPT"
  | "EMPTY_REQUIRED_SECTION"
  | "INTERNAL_PATH_LEAK"
  | "SECRET_LEAK_PATTERN";

export interface PromptQAIssue {
  code: PromptQAIssueCode;
  severity: PromptQAIssueSeverity;
  message: string;
  section?: string;
}

export interface PromptQAMetrics {
  promptLength: number;
  sectionCount: number;
  warningCount: number;
  errorCount: number;
}

export interface PromptQAResult {
  status: PromptQAStatus;
  issues: PromptQAIssue[];
  metrics: PromptQAMetrics;
}

export const promptQALengthThresholds = {
  warning: 4500,
  strongWarning: 6500
} as const;

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  relativePath: text("relative_path").notNull(),
  publicUrl: text("public_url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: text("created_at").notNull()
});

export const projectWorkflows = sqliteTable("project_workflows", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id),
  workflowVersion: integer("workflow_version").notNull(),
  workflowJson: text("workflow_json").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  parentGenerationId: text("parent_generation_id"),
  revisionType: text("revision_type"),
  revisionInstruction: text("revision_instruction"),
  skillId: text("skill_id"),
  skillName: text("skill_name"),
  providerId: text("provider_id").notNull(),
  providerMode: text("provider_mode").notNull(),
  model: text("model"),
  status: text("status").notNull(),
  generationType: text("generation_type").notNull(),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
  durationMs: integer("duration_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDiagnosticsJson: text("error_diagnostics_json"),
  promptQAStatus: text("prompt_qa_status").notNull(),
  promptQAIssuesJson: text("prompt_qa_issues_json").notNull(),
  finalPrompt: text("final_prompt").notNull(),
  workflowSnapshotJson: text("workflow_snapshot_json").notNull(),
  generationConfigJson: text("generation_config_json").notNull(),
  generationPlanJson: text("generation_plan_json").notNull(),
  referenceAssetIdsJson: text("reference_asset_ids_json").notNull(),
  compositionId: text("composition_id").notNull(),
  lookId: text("look_id").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  quality: text("quality").notNull(),
  count: integer("count").notNull(),
  productFidelity: text("product_fidelity").notNull()
});

export const generationImages = sqliteTable("generation_images", {
  id: text("id").primaryKey(),
  generationId: text("generation_id")
    .notNull()
    .references(() => generations.id),
  fileName: text("file_name").notNull(),
  relativePath: text("relative_path").notNull(),
  publicUrl: text("public_url").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: text("created_at").notNull()
});

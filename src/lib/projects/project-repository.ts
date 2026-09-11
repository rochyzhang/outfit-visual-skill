import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assets, projects, projectWorkflows } from "@/lib/db/schema";
import {
  createDefaultWorkflowSnapshot,
  resolveWorkflowSnapshot,
  validateWorkflowSnapshot,
  workflowVersion
} from "@/lib/workflow/workflow-snapshot";
import type { Asset, AssetType, ProjectInfo, WorkflowDraft, WorkflowSnapshotV1 } from "@/types/domain";

const defaultProjectName = "Untitled Outfit Project";

export class ProjectRepositoryError extends Error {
  constructor(
    public readonly code:
      | "DATABASE_UNAVAILABLE"
      | "PROJECT_LOAD_FAILED"
      | "PROJECT_SAVE_FAILED"
      | "INVALID_WORKFLOW_DATA"
      | "ASSET_RECORD_FAILED",
    message: string
  ) {
    super(message);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function rowToProjectInfo(row: typeof projects.$inferSelect): ProjectInfo {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function rowToAsset(row: typeof assets.$inferSelect): Asset {
  return {
    id: row.id,
    type: row.type as AssetType,
    fileName: row.fileName,
    originalFileName: row.originalFileName,
    relativePath: row.relativePath,
    publicUrl: row.publicUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt
  };
}

function referencedAssetIds(snapshot: WorkflowSnapshotV1) {
  return Array.from(
    new Set([
      ...Object.values(snapshot.outfitSlots).filter((assetId): assetId is string => typeof assetId === "string"),
      ...(snapshot.scene.sceneReferenceAssetId ? [snapshot.scene.sceneReferenceAssetId] : [])
    ])
  );
}

async function getOrCreateCurrentProject() {
  try {
    const existingProject = db.select().from(projects).limit(1).get();

    if (existingProject) {
      return existingProject;
    }

    const timestamp = nowIso();
    const project = {
      id: crypto.randomUUID(),
      name: defaultProjectName,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    db.insert(projects).values(project).run();
    db.insert(projectWorkflows)
      .values({
        projectId: project.id,
        workflowVersion,
        workflowJson: JSON.stringify(createDefaultWorkflowSnapshot()),
        updatedAt: timestamp
      })
      .run();

    return project;
  } catch {
    throw new ProjectRepositoryError("DATABASE_UNAVAILABLE", "Database is unavailable.");
  }
}

export async function getCurrentProjectState(): Promise<{
  project: ProjectInfo;
  workflow: WorkflowDraft;
  workflowVersion: number;
  warnings: string[];
}> {
  try {
    const project = await getOrCreateCurrentProject();
    let workflowRow = db
      .select()
      .from(projectWorkflows)
      .where(eq(projectWorkflows.projectId, project.id))
      .get();

    if (!workflowRow) {
      const timestamp = nowIso();
      workflowRow = {
        projectId: project.id,
        workflowVersion,
        workflowJson: JSON.stringify(createDefaultWorkflowSnapshot()),
        updatedAt: timestamp
      };
      db.insert(projectWorkflows).values(workflowRow).run();
    }

    const parsedSnapshot: unknown = JSON.parse(workflowRow.workflowJson);
    const validation = validateWorkflowSnapshot(parsedSnapshot);
    const assetIds = referencedAssetIds(validation.snapshot);
    const assetRows = assetIds.length
      ? db.select().from(assets).where(inArray(assets.id, assetIds)).all()
      : [];
    const assetsById = new Map(assetRows.map((asset) => [asset.id, rowToAsset(asset)]));
    const resolved = resolveWorkflowSnapshot({ snapshot: validation.snapshot, assetsById });

    return {
      project: rowToProjectInfo(project),
      workflow: resolved.workflow,
      workflowVersion: workflowRow.workflowVersion,
      warnings: [...validation.warnings, ...resolved.warnings]
    };
  } catch (error) {
    if (error instanceof ProjectRepositoryError) {
      throw error;
    }

    throw new ProjectRepositoryError("PROJECT_LOAD_FAILED", "Could not load current project.");
  }
}

export async function getCurrentProjectInfo(): Promise<ProjectInfo> {
  try {
    return rowToProjectInfo(await getOrCreateCurrentProject());
  } catch {
    throw new ProjectRepositoryError("PROJECT_LOAD_FAILED", "Could not load current project.");
  }
}

export async function saveCurrentProjectState(input: {
  name?: string;
  workflowSnapshot: WorkflowSnapshotV1;
}): Promise<{
  project: ProjectInfo;
  workflow: WorkflowDraft;
  workflowVersion: number;
  warnings: string[];
}> {
  try {
    const project = await getOrCreateCurrentProject();
    const validation = validateWorkflowSnapshot(input.workflowSnapshot);
    const timestamp = nowIso();
    const projectName = typeof input.name === "string" && input.name.trim() ? input.name.trim() : project.name;

    db.update(projects)
      .set({
        name: projectName,
        updatedAt: timestamp
      })
      .where(eq(projects.id, project.id))
      .run();

    db.insert(projectWorkflows)
      .values({
        projectId: project.id,
        workflowVersion,
        workflowJson: JSON.stringify(validation.snapshot),
        updatedAt: timestamp
      })
      .onConflictDoUpdate({
        target: projectWorkflows.projectId,
        set: {
          workflowVersion,
          workflowJson: JSON.stringify(validation.snapshot),
          updatedAt: timestamp
        }
      })
      .run();

    return getCurrentProjectState();
  } catch (error) {
    if (error instanceof ProjectRepositoryError) {
      throw error;
    }

    throw new ProjectRepositoryError("PROJECT_SAVE_FAILED", "Could not save current project.");
  }
}

export async function persistAssetForCurrentProject(asset: Asset) {
  try {
    const project = await getOrCreateCurrentProject();
    db.insert(assets)
      .values({
        id: asset.id,
        projectId: project.id,
        type: asset.type,
        fileName: asset.fileName,
        originalFileName: asset.originalFileName,
        relativePath: asset.relativePath,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt
      })
      .run();

    return asset;
  } catch {
    throw new ProjectRepositoryError("ASSET_RECORD_FAILED", "Could not create asset record.");
  }
}

export async function getCurrentProjectAsset(assetId: string): Promise<Asset | null> {
  try {
    const project = await getOrCreateCurrentProject();
    const asset = db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .get();

    if (!asset || asset.projectId !== project.id) {
      return null;
    }

    return rowToAsset(asset);
  } catch {
    throw new ProjectRepositoryError("PROJECT_LOAD_FAILED", "Could not load asset record.");
  }
}

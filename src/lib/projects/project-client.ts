"use client";

import type { ProjectInfo, WorkflowDraft, WorkflowSnapshotV1 } from "@/types/domain";

export interface CurrentProjectResponse {
  project: ProjectInfo;
  workflow: WorkflowDraft;
  workflowVersion: number;
  warnings: string[];
}

interface ApiFailure {
  error: {
    code: string;
    message: string;
  };
}

function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function isCurrentProjectResponse(value: unknown): value is CurrentProjectResponse {
  return typeof value === "object" && value !== null && "project" in value && "workflow" in value;
}

async function readJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>;
}

export async function fetchCurrentProject(): Promise<CurrentProjectResponse> {
  const response = await fetch("/api/projects/current", { method: "GET" });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(isApiFailure(payload) ? payload.error.message : "Could not load current project.");
  }

  if (!isCurrentProjectResponse(payload)) {
    throw new Error("Project response was invalid.");
  }

  return payload;
}

export async function saveCurrentProject(input: {
  name?: string;
  workflowSnapshot: WorkflowSnapshotV1;
}): Promise<CurrentProjectResponse> {
  const response = await fetch("/api/projects/current", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(isApiFailure(payload) ? payload.error.message : "Could not save current project.");
  }

  if (!isCurrentProjectResponse(payload)) {
    throw new Error("Project response was invalid.");
  }

  return payload;
}

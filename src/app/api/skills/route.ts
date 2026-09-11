import { NextResponse } from "next/server";
import { listWorkflowSkillManifests } from "@/config/skills";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    skills: listWorkflowSkillManifests()
  });
}

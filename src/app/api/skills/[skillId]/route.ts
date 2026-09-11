import { NextResponse } from "next/server";
import { SkillApiError, resolveSkillForApi, skillManifestForApi } from "@/lib/skills/skill-api-service";

export const runtime = "nodejs";

function errorResponse(error: SkillApiError) {
  return NextResponse.json({ ok: false, error: error.error }, { status: error.status });
}

export async function GET(_request: Request, context: { params: Promise<{ skillId: string }> }) {
  try {
    const { skillId } = await context.params;
    const skill = resolveSkillForApi(skillId);

    return NextResponse.json({
      ok: true,
      skill: skillManifestForApi(skill.id)
    });
  } catch (error) {
    if (error instanceof SkillApiError) {
      return errorResponse(error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "SKILL_INVALID_REQUEST",
          message: "Could not load Skill."
        }
      },
      { status: 500 }
    );
  }
}

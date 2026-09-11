import { NextResponse } from "next/server";
import { SkillApiError, validateSkillApiRequest } from "@/lib/skills/skill-api-service";

export const runtime = "nodejs";

function errorResponse(error: SkillApiError) {
  return NextResponse.json({ ok: false, error: error.error }, { status: error.status });
}

export async function POST(request: Request, context: { params: Promise<{ skillId: string }> }) {
  try {
    const { skillId } = await context.params;
    const body = (await request.json().catch(() => null)) as unknown;
    const result = await validateSkillApiRequest({
      skillId,
      body
    });

    return NextResponse.json({
      ok: true,
      skill: {
        id: result.skill.id,
        name: result.skill.name
      },
      validation: result.validation
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
          message: "Could not validate Skill request."
        }
      },
      { status: 500 }
    );
  }
}

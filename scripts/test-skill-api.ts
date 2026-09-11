import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { GET as listSkills } from "@/app/api/skills/route";
import { GET as getSkill } from "@/app/api/skills/[skillId]/route";
import { POST as validateSkill } from "@/app/api/skills/[skillId]/validate/route";
import { db } from "@/lib/db/client";
import { assets, projects } from "@/lib/db/schema";
import { getCurrentProjectInfo } from "@/lib/projects/project-repository";

function productAsset(projectId: string, id: string): typeof assets.$inferInsert {
  return {
    id,
    projectId,
    type: "product",
    fileName: `product-${crypto.randomUUID()}.png`,
    originalFileName: `${id}.png`,
    relativePath: `assets/${id}.png`,
    publicUrl: `/api/assets/${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1024,
    width: 1000,
    height: 1200,
    createdAt: new Date().toISOString()
  };
}

function sceneAsset(projectId: string, id: string): typeof assets.$inferInsert {
  return {
    ...productAsset(projectId, id),
    type: "scene_reference"
  };
}

async function json<T>(response: Response) {
  return (await response.json()) as T;
}

function postJson(body: unknown) {
  return new Request("http://localhost/api/skills/SK01_MINIMAL_FLAT_LAY/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function main() {
  const project = await getCurrentProjectInfo();
  const assetRows = [
    productAsset(project.id, `skill-api-top-${crypto.randomUUID()}`),
    productAsset(project.id, `skill-api-bottom-${crypto.randomUUID()}`),
    productAsset(project.id, `skill-api-shoes-${crypto.randomUUID()}`),
    sceneAsset(project.id, `skill-api-scene-${crypto.randomUUID()}`)
  ];
  const extraProjectId = `project-${crypto.randomUUID()}`;
  const crossProjectAsset = productAsset(extraProjectId, `skill-api-cross-${crypto.randomUUID()}`);

  try {
    db.insert(projects)
      .values({
        id: extraProjectId,
        name: "Skill API Other Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .run();
    assetRows.forEach((row) => db.insert(assets).values(row).run());
    db.insert(assets).values(crossProjectAsset).run();

    const listResponse = await listSkills();
    assert.equal(listResponse.status, 200);
    const listPayload = await json<{ skills: Array<{ id: string; supportedContentTypes: string[] }> }>(listResponse);
    assert.equal(listPayload.skills.length, 6);
    assert.equal(listPayload.skills.some((skill) => skill.supportedContentTypes.includes("couple")), false);
    assert.doesNotThrow(() => JSON.stringify(listPayload));

    const getResponse = await getSkill(new Request("http://localhost/api/skills/SK01_MINIMAL_FLAT_LAY"), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(getResponse.status, 200);
    assert.equal((await json<{ ok: boolean; skill: { id: string } }>(getResponse)).skill.id, "SK01_MINIMAL_FLAT_LAY");

    const missingResponse = await getSkill(new Request("http://localhost/api/skills/NOPE"), {
      params: Promise.resolve({ skillId: "NOPE" })
    });
    assert.equal(missingResponse.status, 404);
    assert.equal((await json<{ ok: boolean; error: { code: string } }>(missingResponse)).error.code, "SKILL_NOT_FOUND");

    const validBody = {
      contentType: "men",
      assetBindings: {
        top: assetRows[0].id,
        bottom: assetRows[1].id,
        shoes: assetRows[2].id
      }
    };
    const passResponse = await validateSkill(postJson(validBody), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(passResponse.status, 200);
    assert.equal((await json<{ validation: { status: string } }>(passResponse)).validation.status, "pass");

    const missingRequiredResponse = await validateSkill(postJson({ assetBindings: { top: assetRows[0].id, bottom: assetRows[1].id } }), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(missingRequiredResponse.status, 200);
    assert.equal((await json<{ validation: { status: string } }>(missingRequiredResponse)).validation.status, "fail");

    const lookBreakdownFail = await validateSkill(
      postJson({ assetBindings: { top: assetRows[0].id, bottom: assetRows[1].id }, sceneReferenceAssetId: assetRows[3].id }),
      { params: Promise.resolve({ skillId: "SK03_LOOK_BREAKDOWN" }) }
    );
    assert.equal((await json<{ validation: { status: string } }>(lookBreakdownFail)).validation.status, "fail");

    const lookBreakdownPass = await validateSkill(postJson(validBody), {
      params: Promise.resolve({ skillId: "SK03_LOOK_BREAKDOWN" })
    });
    assert.equal((await json<{ validation: { status: string } }>(lookBreakdownPass)).validation.status, "pass");

    const invalidSlot = await validateSkill(postJson({ assetBindings: { torso: assetRows[0].id } }), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(invalidSlot.status, 400);
    assert.equal((await json<{ error: { code: string } }>(invalidSlot)).error.code, "SKILL_INVALID_SLOT");

    const invalidAsset = await validateSkill(postJson({ assetBindings: { top: "../../secret.png" } }), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(invalidAsset.status, 400);
    assert.equal((await json<{ error: { code: string } }>(invalidAsset)).error.code, "SKILL_INVALID_ASSET_BINDING");

    const unsupportedOverride = await validateSkill(postJson({ assetBindings: {}, overrides: { productFidelity: false } }), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(unsupportedOverride.status, 400);
    assert.equal((await json<{ error: { code: string } }>(unsupportedOverride)).error.code, "SKILL_UNSUPPORTED_OVERRIDE");

    const crossProject = await validateSkill(postJson({ assetBindings: { top: crossProjectAsset.id } }), {
      params: Promise.resolve({ skillId: "SK01_MINIMAL_FLAT_LAY" })
    });
    assert.equal(crossProject.status, 403);
    assert.equal((await json<{ error: { code: string } }>(crossProject)).error.code, "SKILL_ASSET_PROJECT_MISMATCH");

    const invalidScene = await validateSkill(postJson({ assetBindings: {}, sceneReferenceAssetId: assetRows[0].id }), {
      params: Promise.resolve({ skillId: "SK04_PROP_STYLING" })
    });
    assert.equal(invalidScene.status, 400);
    assert.equal((await json<{ error: { code: string } }>(invalidScene)).error.code, "SKILL_INVALID_SCENE_REFERENCE");

    const text = JSON.stringify({ listPayload });
    assert.doesNotMatch(text, /sk-[A-Za-z0-9]|Authorization|[A-Z]:\\|storage[\\/]/);
  } finally {
    db.delete(assets)
      .where(inArray(assets.id, [...assetRows.map((row) => row.id), crossProjectAsset.id]))
      .run();
    db.delete(projects).where(eq(projects.id, extraProjectId)).run();
  }

  console.log("Skill API tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

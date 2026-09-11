import assert from "node:assert/strict";
import {
  executeAgentTool,
  getAgentTool,
  isAgentToolName,
  listAgentTools,
  outfitSkillToolNames
} from "@/lib/agent-tools/outfit-skill-tools";

async function main() {
  const tools = listAgentTools();
  const names = tools.map((tool) => tool.name);

  assert.deepEqual(names, [...outfitSkillToolNames]);
  assert.equal(new Set(names).size, 4);
  assert.ok(isAgentToolName("execute_outfit_skill"));
  assert.equal(isAgentToolName("unknown_tool"), false);
  assert.equal(getAgentTool("validate_outfit_skill")?.name, "validate_outfit_skill");
  assert.equal(getAgentTool("unknown_tool"), null);
  assert.doesNotThrow(() => JSON.stringify(tools));

  for (const tool of tools) {
    assert.equal(typeof tool.description, "string");
    assert.ok(tool.description.length > 30);
    assert.equal(tool.inputSchema.type, "object");
    assert.doesNotMatch(JSON.stringify(tool), /Authorization|OPENAI_API_KEY|[A-Z]:\\\\[A-Za-z]|storage[\\/]|rawProviderPayload/);
  }

  const listResult = await executeAgentTool({ toolName: "list_outfit_skills", input: {} });
  assert.equal(listResult.ok, true);
  assert.equal((listResult.data as { skills: unknown[] }).skills.length, 6);
  assert.doesNotMatch(JSON.stringify(listResult), /couple/i);

  const getResult = await executeAgentTool({
    toolName: "get_outfit_skill",
    input: { skillId: "SK02_INVISIBLE_EDITORIAL" }
  });
  assert.equal(getResult.ok, true);
  const skill = (getResult.data as { skill: { defaults: Record<string, unknown>; safeguards: Record<string, unknown> } }).skill;
  assert.equal(skill.defaults.scenePresetId, "S05");
  assert.equal(skill.defaults.compositionPresetId, "C04");
  assert.equal(skill.defaults.graphicPresetId, "None");
  assert.equal(skill.defaults.lookPresetId, "L03");
  assert.equal(skill.defaults.aspectRatio, "3:4");
  assert.equal(skill.defaults.quality, "standard");
  assert.equal(skill.defaults.productFidelity, true);
  assert.equal(skill.safeguards.preserveUploadedProducts, true);

  const missingTool = await executeAgentTool({ toolName: "missing_tool", input: {} });
  assert.equal(missingTool.ok, false);
  assert.equal(missingTool.error.code, "AGENT_TOOL_NOT_FOUND");

  const malformedSkill = await executeAgentTool({
    toolName: "get_outfit_skill",
    input: { skillId: "../../SK02_INVISIBLE_EDITORIAL" }
  });
  assert.equal(malformedSkill.ok, false);
  assert.equal(malformedSkill.error.code, "SKILL_NOT_FOUND");

  console.log("Agent tool registry tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

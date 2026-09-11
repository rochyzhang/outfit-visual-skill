import assert from "node:assert/strict";
import { listAgentTools } from "@/lib/agent-tools/outfit-skill-tools";
import { handleMcpJsonRpcMessage, listMcpSkillTools } from "@/lib/mcp/outfit-skill-mcp";

async function main() {
  const agentTools = listAgentTools();
  const mcpTools = listMcpSkillTools().tools;

  assert.deepEqual(
    mcpTools.map((tool) => tool.name),
    ["list_outfit_skills", "get_outfit_skill", "validate_outfit_skill", "execute_outfit_skill"]
  );
  assert.equal(mcpTools.length, 4);
  assert.equal(new Set(mcpTools.map((tool) => tool.name)).size, 4);

  for (const mcpTool of mcpTools) {
    const agentTool = agentTools.find((tool) => tool.name === mcpTool.name);
    assert.ok(agentTool);
    assert.equal(mcpTool.description, agentTool.description);
    assert.deepEqual(mcpTool.inputSchema, agentTool.inputSchema);
    assert.doesNotMatch(JSON.stringify(mcpTool), /Authorization|OPENAI_API_KEY|[A-Z]:\\\\[A-Za-z]|storage[\\/]|rawProviderPayload/);
  }

  const initialize = await handleMcpJsonRpcMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {}
  });
  assert.equal(initialize?.jsonrpc, "2.0");
  assert.ok(initialize && "result" in initialize);

  const listResponse = await handleMcpJsonRpcMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  });
  assert.ok(listResponse && "result" in listResponse);
  assert.deepEqual((listResponse.result as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name), mcpTools.map((tool) => tool.name));

  const unknown = await handleMcpJsonRpcMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "unknown/method",
    params: {}
  });
  assert.ok(unknown && "error" in unknown);
  assert.equal(unknown.error.code, -32601);

  console.log("MCP tool registry tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

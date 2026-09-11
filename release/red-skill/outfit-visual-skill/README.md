# Outfit Visual Skill Red Skill Package

This package describes the public Outfit Visual Skill for agents. It supports two ways to work:

1. Native Agent Mode
   Use the Skill directly with an Agent that already supports image generation/editing. No separate provider API key is required when your Agent already provides compatible image-generation capabilities.

2. Studio + MCP Mode
   Optional advanced local workflow with the open-source Outfit Visual Studio repository. MCP adds Skill Registry tools, validation, asset IDs, history, revision/retry, and provider automation.

MCP is not required for the public Skill. Do not promise that every Agent supports image generation; if an Agent has neither native image generation/editing nor MCP execution, it should explain that generation cannot be completed in that environment.

It is a source/config package only. It does not include:

- application build output
- local SQLite databases
- uploaded user images
- generated images
- provider credentials
- `node_modules`

## Native Agent Mode

Use Native Agent Mode when the four MCP tools are not available:

- `list_outfit_skills`
- `get_outfit_skill`
- `validate_outfit_skill`
- `execute_outfit_skill`

In this mode the Agent should inspect uploaded references, use the user's explicit garment-role assignments, ask when Required roles are ambiguous, enforce required inputs, preserve Product Fidelity, apply the selected Skill definition from `SKILL.md`, and use its own image-generation/editing capability.

## Studio + MCP Mode

When all four MCP tools are available, use them in this order:

1. `list_outfit_skills`
2. `get_outfit_skill`
3. `validate_outfit_skill`
4. `execute_outfit_skill`

All validation and execution happen in the host Outfit Visual Studio project. Tool calls require explicit asset IDs. The Studio + MCP workflow does not classify images or infer outfit slots.

## Files

- `SKILL.md` - agent-facing instructions.
- `skill-manifest.json` - safe machine-readable metadata.
- `examples/` - example tool calls with fake asset IDs.
- `docs/INPUTS.md` - native reference and MCP asset input contract.
- `docs/WORKFLOW.md` - Native Agent and optional MCP workflows.
- `mcp/config.example.json` - optional local MCP client configuration.

## Safety

Product Fidelity remains ON. Agents must not invent products, substitute missing garments, or ignore required Skill validation failures.

# Outfit Visual Studio Red Skill Package

This package describes the Outfit Visual Studio Skill interface for agents and MCP clients.

It is a source/config package only. It does not include:

- application build output
- local SQLite databases
- uploaded user images
- generated images
- provider credentials
- `node_modules`

## Tool Flow

Use the tools in this order:

1. `list_outfit_skills`
2. `get_outfit_skill`
3. `validate_outfit_skill`
4. `execute_outfit_skill`

All validation and execution happen in the host Outfit Visual Studio project. Tool calls require explicit asset IDs. The Skill does not classify images or infer outfit slots.

## Files

- `SKILL.md` - agent-facing instructions.
- `skill-manifest.json` - safe machine-readable metadata.
- `examples/` - example tool calls with fake asset IDs.
- `docs/INPUTS.md` - input contract and slot rules.
- `docs/WORKFLOW.md` - expected agent workflow.
- `mcp/config.example.json` - generic local MCP client configuration.

## Safety

Product Fidelity remains ON. Agents must not invent products, substitute missing garments, or ignore required Skill validation failures.

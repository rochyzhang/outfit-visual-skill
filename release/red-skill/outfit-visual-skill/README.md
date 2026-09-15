# Outfit Visual Skill Red Skill Package

Version: `1.2.0`

This package describes the public Outfit Visual Skill for agents. It contains six strong native visual contracts and supports two ways to work:

1. Native Agent Mode
   Use the Skill directly with an Agent that already supports image generation/editing. No separate provider API key is required when your Agent already provides compatible image-generation capabilities.

2. Studio + MCP Mode
   Optional advanced local workflow with the open-source Outfit Visual Studio repository. MCP adds Skill Registry tools, validation, asset IDs, history, revision/retry, and provider automation.

MCP is not required for the public Skill. Do not promise that every Agent supports image generation; if an Agent has neither native image generation/editing nor MCP execution, it should explain that generation cannot be completed in that environment.

Users do not need to speak in technical workflow terms. Simple requests such as `Use 01`, `Use 05`, `Use Japanese Catalog`, `用 05 日杂目录感`, or `用 06 韩系街头编辑感` should resolve to the canonical contract in `SKILL.md`.

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

The Skill name is only a human-friendly identifier. The canonical visual contract in `SKILL.md` is authoritative and overrides generic interpretation of names such as Minimal Flat Lay, Japanese Catalog, or Korean Street Editorial.

SK01 remains the realistic minimal flat-lay contract: a naturally laid-out outfit on a slightly cooler, cleaner neutral-grey indoor cement/concrete floor with casual layered placement, soft low-saturation daylight, soft-edged grounded shadows, and real still-life photography feel rather than a pure white cutout collage. SK02 remains the 3D invisible-body editorial contract, now preferring a floor-based reclining or naturally sprawled invisible-person pose in a cleaner neutral-cool light studio; the 3D human presence should come from garment volume, floor contact, and implied body weight, not from an upright walking mannequin or a complex warm environment. SK04 remains the prop-styling contract in a clean empty cool minimal interior with one hero chair or simple hero prop organizing the outfit, generous negative space, and no extra furniture clutter. SK06 is a flat 2D human-silhouette Korean editorial contract: one complete head-to-toe Look, visually flat and graphic, proportionally believable, not a product breakdown and not a volumetric invisible body. SK06 also requires short English per-product callouts with index numbers and hand-drawn leader lines.

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
- `examples/` - native-agent request examples that use real uploaded product references at runtime.
- `examples/visual/` - six approved presentation-style reference images.
- `docs/INPUTS.md` - native reference and MCP asset input contract.
- `docs/WORKFLOW.md` - Native Agent and optional MCP workflows.
- `mcp/config.example.json` - optional local MCP client configuration.

## Safety

Product Fidelity remains ON. Agents must not invent products, substitute missing garments, copy products from reference images, or ignore required Skill validation failures. Skill reference images are presentation-style references only, never product assets.

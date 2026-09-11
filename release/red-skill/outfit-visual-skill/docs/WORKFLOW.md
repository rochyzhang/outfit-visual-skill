# Workflow

Outfit Visual can be used in two modes.

## Mode A: Native Agent Mode

Use this mode when the Agent does not have the Outfit Visual MCP tools but does have compatible native image-generation or image-editing capability.

```text
User references
-> Agent inspects uploaded images
-> Agent maps explicit garment roles
-> Agent checks required inputs
-> Agent applies the selected Skill definition
-> Agent preserves Product Fidelity
-> Agent generates through native image capability
-> Agent returns the generated visual
```

No separate provider API key is required when your Agent already provides compatible image-generation capabilities.

Native Agent Mode rules:

1. Do not claim that MCP tools were called.
2. Do not invent missing products.
3. Keep Recommended Slots optional.
4. Ask for missing Required inputs before generation.
5. Preserve uploaded products over scene, composition, graphic, or look styling.
6. Return the image through the Agent's native image workflow.
7. Do not silently classify or guess Required garment roles when the user's intent is ambiguous.

## Mode B: Studio + MCP Mode

Use this optional advanced mode only when all four MCP tools are available:

- `list_outfit_skills`
- `get_outfit_skill`
- `validate_outfit_skill`
- `execute_outfit_skill`

```text
Agent
-> MCP Tool
-> Outfit Skill orchestration
-> Skill validation
-> GenerationConfig
-> GenerationPlan
-> Prompt QA
-> Provider or Manual Package
-> Result and History
```

Recommended MCP sequence:

1. Call `list_outfit_skills`.
2. Choose the Skill that matches the user's requested visual.
3. Call `get_outfit_skill` for structured requirements.
4. Ask the user or host app for explicit current-project asset IDs.
5. Call `validate_outfit_skill`.
6. If validation passes, call `execute_outfit_skill`.
7. If validation fails, ask for the missing required assets or choose a more appropriate Skill.

Automatic MCP execution returns a normalized generation result and writes normal generation history. Manual MCP execution returns a ChatGPT Manual package; it does not create a fake generated image and does not create success history until a real manual result is imported by the app.

## Unsupported Environment

If the Agent has neither compatible native image generation/editing nor MCP execution, the Skill can still explain requirements and prepare guidance, but it cannot complete generation. The Agent must say that generation cannot be completed in the current environment instead of pretending success.

## Product Fidelity

Product Fidelity remains ON in both modes. Do not override it, weaken it, or ask the generation process to redesign uploaded products.

# Workflow

Outfit Visual Studio Skills sit above the existing production workflow engine.

```text
Agent
-> Agent Tool or MCP Tool
-> Outfit Skill orchestration
-> Skill validation
-> GenerationConfig
-> GenerationPlan
-> Prompt QA
-> Provider or Manual Package
-> Result and History
```

## Recommended Agent Sequence

1. Call `list_outfit_skills`.
2. Choose the Skill that matches the user's requested visual.
3. Call `get_outfit_skill` for structured requirements.
4. Ask the user or host app for explicit asset IDs.
5. Call `validate_outfit_skill`.
6. If validation passes, call `execute_outfit_skill`.
7. If validation fails, ask for the missing required assets or choose a more appropriate Skill.

## Execution Modes

Automatic execution returns a normalized generation result and writes normal generation history.

Manual execution returns a ChatGPT Manual package. It does not create a fake generated image and does not create success history until a real manual result is imported by the app.

## Product Fidelity

Product Fidelity remains ON in V1 Skill execution. Do not override it, weaken it, or ask the generation pipeline to redesign uploaded products.

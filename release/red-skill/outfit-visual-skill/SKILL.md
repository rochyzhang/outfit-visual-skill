# Outfit Visual Studio

## Purpose

Generate menswear and genderless outfit visuals from explicit user-provided product references using reusable visual workflow Skills.

Outfit Visual Studio is designed for product-fidelity-first fashion image production. Uploaded garment references are authoritative, and generated visuals should preserve the visible product design.

## Available Tools

- `list_outfit_skills`
- `get_outfit_skill`
- `validate_outfit_skill`
- `execute_outfit_skill`

## Expected Agent Flow

1. Call `list_outfit_skills`.
2. Select an appropriate Skill for the user's requested visual.
3. Call `get_outfit_skill` to inspect requirements, defaults, safeguards, and supported overrides.
4. Collect explicit asset IDs for the required outfit slots.
5. Call `validate_outfit_skill`.
6. Call `execute_outfit_skill` only when validation allows execution.

## Important Rules

- Never invent missing uploaded assets.
- Missing assets remain empty.
- Recommended slots are optional.
- Required slots must satisfy Skill validation.
- Uploaded product references are authoritative.
- Product Fidelity remains ON.
- Do not silently substitute products.
- Do not disable product-fidelity safeguards.
- Do not pass filesystem paths, URLs, base64 payloads, or fake asset IDs.
- Use only explicit current-project asset IDs supplied by the user or host application.
- Japanese/Korean-inspired styling may be used, but newly generated visible graphic text remains English-only.
- V1 supports `men` and `genderless`.
- Couple workflows are not supported in V1.

## V1 Skills

- `SK01_MINIMAL_FLAT_LAY` - clean single-outfit flat lay.
- `SK02_INVISIBLE_EDITORIAL` - invisible-model fashion editorial.
- `SK03_LOOK_BREAKDOWN` - hero outfit plus product-item breakdown.
- `SK04_PROP_STYLING` - outfit styled with editorial props.
- `SK05_JAPANESE_CATALOG` - Japanese catalog-inspired layout with English-only typography.
- `SK06_KOREAN_STREET_EDITORIAL` - Korean streetwear editorial with English-only annotations.

## Manual And Automatic Modes

`execute_outfit_skill` may return either:

- `mode: "automatic"` with a persisted generation result, or
- `mode: "manual"` with a ChatGPT Manual package.

Manual mode does not mean an image was generated. It returns a prompt package and reference list for a user-controlled manual workflow.

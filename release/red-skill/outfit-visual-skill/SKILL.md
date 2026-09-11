# Outfit Visual Skill

## Purpose

Create menswear and genderless outfit visuals from explicit user-provided product reference images. Product Fidelity is the highest priority: uploaded garments are authoritative and should keep their visible silhouette, color, material, construction, graphics, proportions, hardware, logos, and distinctive details.

## Operating Modes

Use the Outfit Visual MCP workflow only when all four MCP tools are available:

- `list_outfit_skills`
- `get_outfit_skill`
- `validate_outfit_skill`
- `execute_outfit_skill`

If those tools are available, use them in this order:

1. Call `list_outfit_skills`.
2. Select the Skill that matches the user's requested visual.
3. Call `get_outfit_skill` to inspect requirements, defaults, safeguards, and supported overrides.
4. Collect explicit current-project asset IDs for the required slots.
5. Call `validate_outfit_skill`.
6. Call `execute_outfit_skill` only after validation passes.

If any of those MCP tools are unavailable, use Native Agent Mode.

## Native Agent Mode

Native Agent Mode is the default public Skill experience. The user does not need an OpenAI API key, a local Outfit Visual Studio app, or MCP. No separate provider API key is required when your Agent already provides compatible image-generation capabilities.

In Native Agent Mode:

1. Inspect the user's uploaded outfit/product reference images.
2. Identify which references correspond to the user's explicitly stated garment roles.
3. Do not invent missing uploaded products.
4. Select or follow the requested Outfit Visual Skill.
5. Apply the Skill's Scene, Composition, Graphic, and Look rules.
6. Preserve Product Fidelity above all styling directions.
7. Treat Recommended Slots as optional.
8. Block or ask for missing Required inputs when necessary.
9. Use the Agent's own available image-generation or image-editing capability.
10. Return the generated visual through the Agent's native image workflow.

Do not claim an MCP tool was called when none is available. If the environment has neither MCP execution nor compatible native image generation/editing, explain that generation cannot be completed in that environment and state which required capability is missing.

Native Agent Mode does not add automatic asset classification. If the user explicitly identifies images as Top, Outer, Bottom, Shoes, or another supported slot, use those roles. If Required garment roles cannot be determined reliably from the user's instructions or uploaded context, ask the user to clarify rather than silently guessing or inventing the assignment.

## Global Rules

- Never invent missing uploaded products.
- Missing product references remain empty.
- Recommended slots are optional.
- Required slots must be satisfied before generation.
- Uploaded product references are authoritative.
- Product Fidelity remains ON.
- Do not substitute similar garments for missing required garments.
- Do not weaken product-fidelity safeguards.
- Do not add new logos, prints, text, or product details unless directly present in references or requested as non-product graphic layout.
- V1 supports `men` and `genderless`.
- Couple workflows are not supported in V1.
- Japanese/Korean-inspired styling may be used, but newly generated visible graphic text must remain English-only.

## Portable V1 Skill Definitions

### SK01 Minimal Flat Lay

- Purpose: Clean, easy-to-read single-outfit flat lay for menswear or genderless styling.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`.
- Scene: Minimal neutral studio surface, clean daylight, uncluttered space.
- Composition: Organized flat lay with the full outfit clearly visible; garments arranged with realistic scale and spacing.
- Graphic: None by default.
- Look: Clean, restrained, product-led styling.
- Product Fidelity: Preserve each uploaded garment's design, color, material, graphics, and proportions.
- Visible-text safeguards: Avoid generated labels unless requested; any new visible text must be English-only.

### SK02 Invisible Editorial

- Purpose: Dynamic invisible-model editorial outfit visual with stronger fashion mood.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Scene: Warm off-white editorial studio environment with soft paper-like or plaster-like surface.
- Composition: Complete outfit shaped into the silhouette of an invisible person in motion; no visible person and no mannequin.
- Graphic: None by default.
- Look: Warm directional editorial light, muted cinematic contrast, subtle analog texture.
- Product Fidelity: Garments may be repositioned or articulated, but must not be redesigned or replaced.
- Visible-text safeguards: Avoid visible generated text unless explicitly requested; any new visible text must be English-only.

### SK03 Look Breakdown

- Purpose: Editorial outfit breakdown combining a hero look with product-item explanation.
- Required inputs: At least 3 valid uploaded product references.
- Recommended inputs: `top`, `outer`, `bottom`, `shoes`, `bag`, `hat`, `glasses`, `accessory01`, `accessory02`.
- Scene: Clean editorial backdrop that supports product comparison and a readable hero arrangement.
- Composition: One hero outfit plus separated product callouts or item breakdown zones.
- Graphic: English-only labels, numbers, or short callouts may be used when helpful.
- Look: Magazine-style clarity with product-focused hierarchy.
- Product Fidelity: Do not simplify, recolor, or substitute any listed item.
- Visible-text safeguards: All generated labels/callouts must be English-only and must not invent brand claims.

### SK04 Prop Styling

- Purpose: Lifestyle or editorial outfit arrangement around a chair, furniture piece, or styling object.
- Required inputs: `bottom` and at least one of `top` or `outer`.
- Recommended inputs: `shoes`, `bag`, `hat`, `socks`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Scene: Editorial interior or studio prop environment with restrained lifestyle context.
- Composition: Outfit styled around or over a prop; props support the garments and must not dominate them.
- Graphic: None by default.
- Look: Tactile fashion editorial with believable drape, folds, and object contact.
- Product Fidelity: Props may shape garment placement but must not obscure or redesign core products.
- Visible-text safeguards: Avoid visible generated text unless requested; any new visible text must be English-only.

### SK05 Japanese Catalog

- Purpose: Japanese magazine/catalog-inspired single-outfit styling with English-only catalog typography.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`.
- Scene: Clean catalog studio or editorial surface with neat spacing and calm visual order.
- Composition: Catalog-style outfit presentation with readable product arrangement.
- Graphic: English-only catalog typography, minimal item labels, spacing rules, or layout marks.
- Look: Quiet, polished, magazine-catalog styling with clear product readability.
- Product Fidelity: Catalog graphics must not cover or alter product-defining details.
- Visible-text safeguards: Newly generated typography must be English-only; do not generate Japanese text.

### SK06 Korean Street Editorial

- Purpose: Korean streetwear or Seoul editorial-inspired outfit visual with English-only annotations.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Scene: Urban editorial or studio-street environment inspired by Korean street fashion.
- Composition: Street-editorial outfit presentation with energetic but controlled framing.
- Graphic: English-only annotations or editorial marks may be used when requested or appropriate.
- Look: Contemporary streetwear mood, crisp styling, modern contrast, clean visual rhythm.
- Product Fidelity: Street styling must not introduce unrelated garments or change uploaded product identity.
- Visible-text safeguards: Newly generated annotations must be English-only; do not generate Korean text.

## Required Input Handling

When a requested Skill lacks required inputs, stop and ask for the missing reference images or choose a Skill whose requirements are satisfied. Do not silently continue with missing required products.

When the user provides uploaded references but does not state their roles, ask them to identify the garment roles whenever Required role assignment is ambiguous. Do not silently classify or guess Required garment roles from images alone.

## Product Fidelity Prompting

Every generation request should include a product-fidelity instruction equivalent to:

Preserve each uploaded product reference as the source of truth. Keep the garment silhouette, proportions, material, color, pattern, graphics, construction, hardware, trims, and visible logos. Do not redesign, recolor, replace, simplify, or invent product details. Styling, scene, composition, and graphic layout must never override product fidelity.

## Completion Behavior

- If Native Agent Mode succeeds, return the generated image through the Agent's native image result mechanism.
- If MCP Mode succeeds, return the MCP execution result or generated image metadata.
- If generation cannot be completed because the environment lacks both MCP execution and native image generation/editing, say so clearly and do not pretend an image was generated.

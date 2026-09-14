# Inputs

Outfit Visual accepts different input forms depending on the mode.

## Native Agent Mode Inputs

Native Agent Mode uses the user's uploaded product reference images plus explicit garment-role instructions.

The Agent should:

- Inspect uploaded outfit/product reference images.
- Use the user's explicitly stated roles when provided.
- Ask when Required garment roles are missing, unclear, or ambiguous.
- Avoid silently classifying or guessing Required garment roles from images alone.
- Never invent missing uploaded products.
- Keep Recommended Slots optional.

Native Agent Mode does not require current-project asset IDs, a local database, or MCP.
Native Agent Mode does not add automatic asset classification.

## Studio + MCP Mode Inputs

MCP tool calls use the same safe public input contract as Outfit Visual Studio's Skill API.

## MCP Request Fields

- `skillId`: one of the six canonical Skill IDs.
- `projectId`: `current`.
- `contentType`: `men` or `genderless`.
- `assetBindings`: object keyed by supported outfit slot IDs, with values set to real current-project asset IDs.
- `sceneReferenceAssetId`: optional real current-project scene reference asset ID.
- `overrides`: optional supported Skill overrides.

## Asset Binding Rules

- Asset bindings must be explicit current-project asset IDs.
- Do not pass local filesystem paths.
- Do not pass arbitrary public URLs.
- Do not pass base64 data.
- Do not fabricate asset IDs.
- Missing slots remain empty.
- Recommended slots are optional.
- Required slot failures are handled by Skill validation.
- Asset IDs are only needed in Studio + MCP Mode.

## Supported Outfit Slot IDs

- `hat`
- `glasses`
- `neck`
- `inner`
- `top`
- `outer`
- `bottom`
- `socks`
- `shoes`
- `bag`
- `accessory01`
- `accessory02`
- `prop01`
- `prop02`

## Supported Overrides

- `scenePresetId`
- `compositionPresetId`
- `graphicPresetId`
- `lookPresetId`
- `aspectRatio`
- `quality`
- `providerId`
- `notes`

Unsupported overrides must be rejected. Product Fidelity cannot be disabled.

## Content Types

V1 supports:

- `men`
- `genderless`

V1 does not support couple workflows.

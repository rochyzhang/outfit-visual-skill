# Inputs

Tool calls use the same safe public input contract as Outfit Visual Studio's Skill API.

## Common Fields

```json
{
  "skillId": "SK01_MINIMAL_FLAT_LAY",
  "projectId": "current",
  "contentType": "men",
  "assetBindings": {
    "top": "asset_example_top",
    "bottom": "asset_example_bottom",
    "shoes": "asset_example_shoes"
  },
  "sceneReferenceAssetId": null,
  "overrides": {
    "providerId": "openai",
    "quality": "standard"
  }
}
```

## Asset Binding Rules

- Asset bindings must be explicit current-project asset IDs.
- Do not pass local filesystem paths.
- Do not pass arbitrary public URLs.
- Do not pass base64 data.
- Do not fabricate fake asset IDs in real execution.
- Missing slots remain empty.
- Recommended slots are optional.
- Required slot failures are handled by Skill validation.

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

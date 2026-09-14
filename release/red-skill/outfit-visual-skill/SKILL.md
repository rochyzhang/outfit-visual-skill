---
name: Outfit Visual Skill
description: Create outfit visuals using six reusable presentation styles. Users may request a style by 01-06 code, English Skill name, or short visual description.
---

# Outfit Visual Skill

## Purpose

Create menswear and genderless outfit visuals from explicit user-provided product reference images using six canonical presentation contracts. Product Fidelity is the highest priority: uploaded products are authoritative and should keep their visible silhouette, color, material, construction, graphics, proportions, hardware, logos, and distinctive details.

This public Skill can run in two modes:

- Native Agent Mode: default fallback when Outfit Visual MCP tools are unavailable and the host Agent has compatible image generation/editing capability.
- Studio + MCP Mode: optional advanced workflow when the Outfit Visual MCP tools are available.

If the host Agent cannot generate or edit images, clearly state that the current environment does not provide compatible image generation/editing capability. Never pretend that an image was generated.

## Visual Skill Reference

Use this exact mapping:

01 = `SK01_MINIMAL_FLAT_LAY` — Minimal Flat Lay
干净平铺穿搭图，适合整套搭配展示

02 = `SK02_INVISIBLE_EDITORIAL` — Invisible Editorial
隐形人物感穿搭编辑图，有动态、杂志感

03 = `SK03_LOOK_BREAKDOWN` — Look Breakdown
整套 Look + 单品拆解说明

04 = `SK04_PROP_STYLING` — Prop Styling
衣服与椅子、家具或小物一起陈列

05 = `SK05_JAPANESE_CATALOG` — Japanese Catalog
日杂 / 日系目录感穿搭视觉

06 = `SK06_KOREAN_STREET_EDITORIAL` — Korean Street Editorial
韩系 / 首尔街头编辑感穿搭图

Users may refer to a visual style by:

- number
- English name
- short visual description

Examples:

- "Use 01"
- "Use 02"
- "Use Minimal Flat Lay"
- "Use Invisible Editorial"
- "用 05 日杂目录感"
- "用 06 韩系街头编辑感"

Do not add complex auto-routing rules. Resolve simple user language to the fixed contract above.

## Canonical Contract Overrides Name Interpretation

The Skill name is only a human-friendly identifier. The canonical Visual Contract is authoritative.

The Agent must not reinterpret a Skill using its own general knowledge. For example:

- "Japanese Catalog" must not become a generic Japanese fashion model photograph. It must follow `SK05_JAPANESE_CATALOG`.
- "Korean Street Editorial" must not become any generic Korean street-fashion portrait. It must follow `SK06_KOREAN_STREET_EDITORIAL`.

## Operating Modes

Use Studio + MCP Mode only when all four MCP tools are available:

- `list_outfit_skills`
- `get_outfit_skill`
- `validate_outfit_skill`
- `execute_outfit_skill`

If those tools are available:

1. Call `list_outfit_skills`.
2. Select the Skill that matches the user's requested visual.
3. Call `get_outfit_skill`.
4. Collect explicit current-project asset IDs for required slots.
5. Call `validate_outfit_skill`.
6. Call `execute_outfit_skill` only after validation passes.

If any MCP tool is unavailable, use Native Agent Mode.

## Native Agent Execution Contract

When MCP tools are unavailable but the host Agent supports compatible native image generation/editing:

1. Resolve the requested Skill.
2. Resolve the canonical Skill contract.
3. Check Required Inputs.
4. Preserve only user-provided product references.
5. Apply the canonical Scene / Composition / Graphic / Look contract.
6. Apply Product Fidelity as the highest priority.
7. Apply forbidden-element rules.
8. Generate using the host Agent's native image capability.
9. Perform post-generation QA.
10. If a hard constraint fails, do not describe the result as fully compliant.
11. If the host Agent supports image revision, perform a targeted revision.
12. Never fabricate missing products or silently substitute products.

Native Agent Mode does not add automatic asset classification. If the user explicitly identifies images as Top, Outer, Bottom, Shoes, or another supported slot, use those roles. If Required garment roles cannot be determined reliably from the user's instructions or uploaded context, ask for clarification.

## Global Priority Order

Apply this priority order:

```text
PRODUCT FIDELITY
>
COMPOSITION
>
SCENE
>
LOOK / STYLE
>
GRAPHIC
```

When aesthetic impact and product accuracy conflict, product fidelity wins. Preserve user-uploaded products instead of modifying them to achieve a stronger visual style.

## Global Asset Rule

NO UPLOAD = EMPTY.

The Skill must not:

- invent a garment
- invent an accessory
- invent a prop
- copy an item from a Skill reference image
- borrow an item from another uploaded image
- duplicate a product
- replace a missing product with a visually similar product
- silently infer an unassigned required garment role
- treat Skill example images as product references

User-uploaded product images are authoritative. Skill reference images are presentation-style references only.

## Required And Recommended Input Rule

Required slots block generation when missing. Recommended slots never block generation. Missing Recommended items remain empty. Do not fabricate Recommended items.

Supported content types: `men`, `genderless`. Couple workflows are not supported in V1.

## Post-Generation QA

Hard fail examples:

- required product missing
- invented product
- substituted product
- major product identity changed
- forbidden human presence
- wrong core composition
- wrong Skill
- wrong output type
- prohibited visible text

If a hard fail occurs, do not present the result as fully compliant. If native image revision is available, perform a targeted revision without changing already-correct products.

Soft revision examples:

- weak lighting match
- weak grain or texture
- graphic spacing issue
- typography placement issue
- slightly weak color treatment
- minor composition refinement

Soft revision issues may be corrected with targeted revision when available.

## Reference Image Semantics

The six package images in `examples/visual/` are presentation-style references only. They are not product references and must never be treated as garments, shoes, bags, accessories, props, or user assets.

If the host Agent supports using Skill package images as visual references, use them only to understand presentation style. The user's uploaded product images always have priority.

## Visual Contracts

### 01 — Minimal Flat Lay

- ID: `SK01_MINIMAL_FLAT_LAY`
- Name: Minimal Flat Lay
- Short visual description: 干净平铺穿搭图，适合整套搭配展示
- Intent: Clean, controlled single-outfit product presentation. The uploaded outfit is the primary subject.
- Canonical presets: Scene `S01` White Studio; Composition `C02` Full Outfit Flat Lay; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No human model, no portrait, no visible body.
- Composition rule: Top-down or near top-down flat lay; complete outfit visible; top above bottom; shoes positioned naturally near lower body area; accessories casually distributed if uploaded.
- Scene rule: Clean warm-white seamless studio, minimal continuous surface, large negative space, no distracting architecture.
- Look rule: High-key diffused studio lighting, neutral white balance, accurate garment colors, clean low-to-medium contrast.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Preserve actual garment silhouettes, proportions, material, graphics, hardware, trims, and colors.
- Forbidden elements: portrait photography, fashion model photography, lifestyle street photography, unrelated room photography, ecommerce grid rigidity, missing required products, invented products.
- Post-generation QA: Verify full outfit flat lay, required products present, no model/body, product identity preserved, no unrequested graphic text.
- Reference image path: `examples/visual/01-minimal-flat-lay.jpg`

### 02 — Invisible Editorial

- ID: `SK02_INVISIBLE_EDITORIAL`
- Name: Invisible Editorial
- Short visual description: 隐形人物感穿搭编辑图，有动态、杂志感
- Intent: Dynamic invisible-body fashion editorial. Clothing may imply motion and human structure while remaining clothing-only.
- Canonical presets: Scene `S05` Warm Off-white; Composition `C04` Dynamic Invisible Outfit; Graphic `None`; Look `L03` Burgundy Editorial; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human face, no visible human skin, no visible identifiable human model, no mannequin.
- Composition rule: Outfit shaped into the silhouette of an invisible person in motion; arms and legs implied through clothes; shoes aligned with implied feet.
- Scene rule: Warm off-white studio, creamy neutral background, minimal editorial space, soft paper-like or plaster-like surface.
- Look rule: Warm directional editorial light, soft falloff, rich muted tonal response, deeper soft shadows, subtle analog film grain.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Garments may be articulated into motion, but must not be redesigned, replaced, or simplified.
- Forbidden elements: ordinary model photography, visible skin, visible face, mannequin, missing required products, invented products, distorted shoes.
- Post-generation QA: Verify invisible-body presentation, no visible person/mannequin, required products present, motion reads clearly, product identity preserved.
- Reference image path: `examples/visual/02-invisible-editorial.jpg`

### 03 — Look Breakdown

- ID: `SK03_LOOK_BREAKDOWN`
- Name: Look Breakdown
- Short visual description: 整套 Look + 单品拆解说明
- Intent: Editorial layout showing a complete Look plus individual product/component breakdown.
- Canonical presets: Scene `S01` White Studio; Composition `C05` Model + Item Breakdown; Graphic `G01` Minimal Label; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: at least 3 valid user-provided product/outfit references.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: A primary visual may be model-based or outfit-based; do not force a human model.
- Composition rule: One primary styled look with separate clothing pieces and accessories displayed around or beside it; clear hierarchy, generous negative space.
- Scene rule: Clean warm-white seamless studio with minimal continuous surface.
- Look rule: High-key diffused studio lighting, neutral white balance, clean catalog clarity.
- Graphic rule: Minimal English editorial typography, small item numbers, thin restrained sans-serif labels, subtle product annotations.
- Product Fidelity rule: Do not copy products from the Skill reference image; use only user-provided products and preserve them.
- Forbidden elements: copied reference-image products, invented missing products, non-English generated labels, cluttered poster layout, wrong Skill/output type.
- Post-generation QA: Verify at least 3 user products, primary look plus item breakdown, English-only visible text, product identity preserved.
- Reference image path: `examples/visual/03-look-breakdown.jpg`

### 04 — Prop Styling

- ID: `SK04_PROP_STYLING`
- Name: Prop Styling
- Short visual description: 衣服与椅子、家具或小物一起陈列
- Intent: Product-first still life where outfit pieces are styled with supporting props or physical context.
- Canonical presets: Scene `S03` Grey Concrete; Composition `C03` Chair / Object Styling; Graphic `None`; Look `L04` Concrete Grey; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom` and at least one of `top` or `outer`.
- Recommended inputs: `shoes`, `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human model is required; keep the focus on outfit/object styling.
- Composition rule: Outfit naturally arranged on or around a chair, furniture piece, or object; slightly surreal is allowed only when physically believable.
- Scene rule: Light grey concrete studio interior, subtle concrete surface texture, minimal industrial environment.
- Look rule: Soft natural-window light, cool neutral palette, slightly desaturated color, quiet industrial city-boy lifestyle mood.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Props support the products; they must not obscure, replace, or dominate uploaded outfit references.
- Forbidden elements: prop becomes main subject, invented fashion products, copied reference-image props as products, missing required products, impossible fabric contact.
- Post-generation QA: Verify required products present, product remains primary, props support composition, product identity preserved.
- Reference image path: `examples/visual/04-prop-styling.jpg`

### 05 — Japanese Catalog

- ID: `SK05_JAPANESE_CATALOG`
- Name: Japanese Catalog
- Short visual description: 日杂 / 日系目录感穿搭视觉
- Intent: Japanese magazine/catalog-inspired clothing presentation with precise catalog layout and English-only typography. This is not generic Japanese model photography.
- Canonical presets: Scene `S05` Warm Off-white; Composition `C02` Full Outfit Flat Lay; Graphic `G04` Japanese Catalog; Look `L05` Warm Vintage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: Follow the canonical clothing/product presentation; do not replace it with generic model photography.
- Composition rule: Full outfit flat lay/catalog presentation; complete outfit visible; precise editorial order and readable product arrangement.
- Scene rule: Warm off-white studio, creamy neutral background, minimal editorial space, soft paper-like or plaster-like surface.
- Look rule: Soft low-contrast light, warm off-white highlights, slightly faded earthy tones, fine analog grain, restrained vintage catalog mood.
- Graphic rule: English editorial fashion catalog typography inspired by Japanese magazine layout; small English technical product labels; precise alignment; generous white space. No Japanese characters.
- Product Fidelity rule: Catalog styling and typography must not cover, modify, or replace product-defining details.
- Forbidden elements: generic Japanese model portrait, Japanese text, arbitrary Japanese typography, invented products, missing required products, copied reference-image products.
- Post-generation QA: Verify full outfit flat lay/catalog composition, English-only visible text, no Japanese characters, product identity preserved.
- Reference image path: `examples/visual/05-japanese-catalog.png`

### 06 — Korean Street Editorial

- ID: `SK06_KOREAN_STREET_EDITORIAL`
- Name: Korean Street Editorial
- Short visual description: 韩系 / 首尔街头编辑感穿搭图
- Intent: Korean/Seoul-inspired editorial visual language applied to the canonical dynamic invisible outfit composition. This is not generic Korean model portrait photography.
- Canonical presets: Scene `S02` Dusty Sage; Composition `C04` Dynamic Invisible Outfit; Graphic `G02` Korean Street; Look `L01` Dusty Sage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible person and no mannequin for the canonical C04 composition.
- Composition rule: Complete outfit shaped into the silhouette of an invisible person in motion; dynamic garment articulation; shoes aligned with implied feet.
- Scene rule: Muted dusty sage green seamless studio background, quiet minimal editorial environment, large negative space.
- Look rule: Soft diffused studio lighting, low saturation, muted sage-green cast, matte soft contrast, fine analog grain.
- Graphic rule: English-only Korean independent streetwear/Seoul editorial annotations, concise handwritten-style English notes, item numbers, restrained logo placement. No Hangul or Korean-language text.
- Product Fidelity rule: Korean-inspired styling must not introduce unrelated products, change uploaded product identity, or invent accessories.
- Forbidden elements: Korean model portrait, visible body/skin/face, mannequin, Hangul/Korean text, invented products, missing required products, copied reference-image products.
- Post-generation QA: Verify dynamic invisible outfit, no visible person/mannequin, English-only annotations, no Korean text, product identity preserved.
- Reference image path: `examples/visual/06-korean-street-editorial.jpg`

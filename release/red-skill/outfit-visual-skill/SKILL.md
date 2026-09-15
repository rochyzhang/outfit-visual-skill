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

Concise contrast:

- `SK02_INVISIBLE_EDITORIAL`: dynamic invisible-body editorial.
- `SK06_KOREAN_STREET_EDITORIAL`: flat 2D human-silhouette Korean editorial.

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
- Intent: Realistic minimal flat-lay / laid-out outfit still life. The uploaded outfit is the primary subject, photographed as one believable casual arrangement rather than a cutout collage.
- Canonical presets: Scene `S01` White Studio; Composition `C02` Full Outfit Flat Lay; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No human model, no portrait, no visible body.
- Composition rule: True overhead or near top-down realistic flat lay; target an 85-90 degree downward camera angle; complete outfit visible; top above bottom; shoes positioned naturally near lower body area; accessories casually distributed if uploaded. Placement should feel casually but intentionally arranged, with mild overlap, rhythm, visual hierarchy, believable contact with the floor, soft-edged grounded shadows, and small arrangement imperfections. Products should not look too evenly separated, pasted on, floating, or disconnected.
- Scene rule: Natural indoor cement/concrete floor feeling close to the approved `01-minimal-flat-lay.jpg` presentation reference: slightly cooler clean neutral-grey concrete or cement floor, subtle natural floor texture, airy and clean but not empty-white studio backdrop, and no distracting architecture. Keep product colors faithful while cooling and cleaning only the environment.
- Look rule: Soft low-saturation natural daylight, slightly cooler clean neutral-grey environment, restrained contrast, soft-edged shadows, neutral white balance, accurate garment colors, and real editorial still-life photography feel. Avoid warm beige floor appearance, brownish-grey or muddy grey cast, dirty warm cement tone, yellow cast, overly contrasty floor texture, hard shadow, dramatic spotlight, side-angle fashion editorial feel, bright white seamless background, and pasted-on cutout feeling.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Preserve actual garment silhouettes, proportions, material, graphics, hardware, trims, and colors.
- Forbidden elements: portrait photography, fashion model photography, lifestyle street photography, unrelated room photography, pure white cutout canvas, floating graphic composition, sterile ecommerce background, rigid product grid, pasted-on compositing, disconnected evenly separated products, warm beige/yellow floor cast, brownish-grey or muddy grey cast, dirty warm cement tone, overly contrasty floor texture, hard spotlight, missing required products, invented products.
- Post-generation QA: Verify realistic minimal flat lay, true overhead/top-down camera feel, slightly cooler clean neutral-grey indoor cement/concrete floor, casual layered placement, believable floor contact and soft-edged grounded shadows, required products present, no model/body, product identity preserved, and no unrequested graphic text. Soft revision if the floor reads too white instead of natural concrete, floor reads too warm/beige, floor reads brownish-grey/muddy, cement tone feels dirty-warm, lighting is too hard, image is too yellow, floor texture is overly contrasty, camera is not top-down enough, surface feels too sterile or graphic, placement is too evenly separated, or flat lay feels pasted rather than photographed.
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
- Composition rule: Outfit shaped into the silhouette of an invisible person in motion, with the approved `02-invisible-editorial.jpg` reference as the pose target. Prefer an invisible outfit lying or naturally sprawled on the floor rather than standing, walking, runway, or floating mannequin-like poses. Keep one coherent reclining body arrangement with diagonal or grounded floor-based posture, implied anatomy, garment folds, floor contact, and body weight. Arms and legs may be implied through clothes; shoes align with implied feet. The viewer should feel an invisible person is lying or sprawled naturally on the floor while no face, skin, person, or mannequin is visible.
- Scene rule: Clean lighter minimal floor-based studio close to the approved `02-invisible-editorial.jpg` presentation reference: clean white, off-white, pale grey, or very light neutral-cool floor/background, visually quiet, high negative space, very low environmental complexity, minimal or no decorative props, and no unnecessary furniture. Use a clean grounded surface that supports the reclining or sprawled invisible-body arrangement. A subtle floor/background transition and subtle grounding shadows are allowed. The 3D invisible-human impression must come from garment volume, body occupancy, floor contact, and body weight, not from complex 3D environment, busy interior styling, strong architectural storytelling, dramatic set design, heavy warm backdrop, warm beige dominance, obvious yellow wall tone, clutter, or strong colored environmental cast.
- Look rule: Soft diffuse studio daylight, cleaner and brighter but not overexposed, subtle shadows, low-to-medium contrast, soft neutral-to-cool palette, neutral-cool whites, pale grey or restrained soft light greige, clean premium atmosphere, and low yellow/orange warmth. Preserve the dimensional invisible-person presentation; only cool and clean the environment, light, and color grade.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Garments may be articulated into motion, but must not be redesigned, replaced, or simplified.
- Forbidden elements: ordinary model photography, visible skin, visible face, mannequin, missing required products, invented products, distorted shoes, upright standing pose, walking pose, runway stance, floating standing invisible mannequin, SK06-like flat 2D silhouette, product breakdown, generic flat lay, prop-styling scene, unnecessary furniture, decorative objects, strongly textured walls, dramatic studio architecture, visually dominant shadows, strong colored backdrop, elaborate editorial set, clutter, warm yellow lighting, creamy beige dominance, golden editorial warmth, heavy orange cast, hard spotlight, overly cozy room tone.
- Post-generation QA: Verify invisible-body presentation, clear 3D garment volume, believable body occupancy without visible human, reclining or naturally sprawled floor-based pose, floor contact and implied body weight, no visible person/mannequin, required products present, motion reads clearly, product identity preserved, and clean neutral-cool minimal studio scene fidelity. Hard fail if the scene becomes so dominant that SK02 is no longer recognizably an Invisible Editorial presentation or if the output becomes an upright standing/walking invisible mannequin. Soft revision if the background is too warm, environment is too yellow/creamy, lighting is too warm, scene is not clean enough, the pose remains too upright/standing/walking, the invisible-person structure is preserved but the overall look lacks the cool clean editorial tone of reference 02, background is too busy, unnecessary furniture appears, decorative props compete with the outfit, excessive architectural detail appears, or dramatic set design weakens the clean studio identity. Do not treat subtle neutral floor transitions, soft studio shadows, or minimal grounding as failures.
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
- Composition rule: Outfit naturally arranged on or around one visually dominant hero chair or similarly simple hero prop; slightly surreal is allowed only when physically believable. The outfit must interact naturally with the single anchor: garments may drape over or through the chair, trousers may fall from the seat, bags may hang from or rest against it, and shoes should ground beside it. Avoid simply placing independent products around a prop; the prop should organize the outfit spatially without distorting uploaded products. Do not add secondary furniture or prop clusters.
- Scene rule: Clean empty interior close to the approved `04-prop-styling.jpg` presentation reference: plain wall, clean floor, simple wall/floor relationship, cool grey, stone grey, or neutral concrete-like tones, generous negative space, restrained premium materials, and one dominant chair as the spatial anchor. Tiny styling details are acceptable only if they do not read as additional furniture. Avoid shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architecture, warm yellow room tone, orange cast, overly cozy mood, or prop-heavy storytelling.
- Look rule: Soft diffused daylight, gentle grounded shadows, cool neutral palette, low saturation, slightly desaturated color, restrained premium mood, and quiet industrial lifestyle editorial mood. Avoid hard spotlight, theatrical contrast, orange cast, and vintage warm filter.
- Graphic rule: No graphic overlay by default.
- Product Fidelity rule: Props support the products; they must not obscure, replace, dominate, or distort uploaded outfit references. Prop fidelity must never override Product Fidelity.
- Forbidden elements: no meaningful prop/object relationship, generic flat lay, product breakdown, catalog grid, prop becomes main subject, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architectural backgrounds, prop-heavy storytelling, warm yellow room tone, orange cast, overly cozy mood, hard spotlight, theatrical contrast, invented fashion products, copied reference-image props as products, missing required products, impossible fabric contact.
- Post-generation QA: Verify required products present, product remains primary, one hero chair/prop is clearly dominant, the outfit/prop spatial relationship is natural, props support composition, product identity preserved, and clean empty cool minimal interior scene fidelity. Hard fail if there is no meaningful prop/object relationship; the output becomes a generic flat lay, product breakdown, or catalog grid; the scene dominates so strongly that outfit styling becomes secondary; or Product Fidelity is violated. Soft revision if additional cabinet/shelf/table appears, background has unnecessary furniture, the scene becomes too architectural, negative space is reduced by extra objects, background is too warm, interior feels too cozy/yellow, lighting is too hard, result lacks the cool restrained premium tone of reference 04, there are too many props, multiple furniture pieces compete, the room is too decorative, the hero prop is not clearly dominant, the outfit/prop relationship is weak, or unnecessary lifestyle clutter appears.
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
- Intent: Korean independent-brand / Seoul editorial with a flat 2D human-silhouette outfit composition. The garments form one complete human-shaped Look while remaining visually flat, graphic, and close to a styled flat-lay rather than a volumetric invisible body. This is not generic Korean model portrait photography and not the same 3D invisible-body editorial as SK02.
- Canonical presets: Scene `S02` Dusty Sage; Composition `C04` Dynamic Invisible Outfit; Graphic `G02` Korean Street; Look `L01` Dusty Sage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human face, no visible skin, no real model, and no mannequin. Avoid the strong three-dimensional invisible-human illusion used by SK02.
- Composition rule: Use C04 as a base for a flat human-silhouette outfit composition. Preserve one coherent head-to-toe outfit relationship: top or outer above bottom, bottom connected to the leg area, shoes near the implied feet, optional hat near the head position, optional glasses near the face/head position, bag at the shoulder/body side or slightly offset, and accessories associated with their natural styling positions. Flatness refers to depth, not incorrect scale: preserve believable full-outfit human proportions, including upper-body scale, waist placement, bottom length, shoe size, bag scale, and accessory scale. Treat the complete outfit as the primary composition unit before scaling individual products, and maintain useful negative space around the complete Look. Prefer flattened garment presentation, front-facing or mildly angled layout, low depth, low perspective, graphic silhouette, restrained garment volume, clean overall outline, and complete outfit readability. Controlled small offsets are allowed, but do not scatter garments into independent product tiles or a product breakdown.
- Scene rule: Muted dusty sage green seamless studio background, quiet minimal editorial environment, large negative space.
- Look rule: Soft diffused studio lighting, low saturation, muted sage-green cast, matte soft contrast, fine analog grain.
- Graphic rule: English-only Korean independent-brand / Seoul editorial annotations are required for every major displayed product. Each major product should receive a small index number, a short 1-3 word English product label, and a thin hand-drawn-style leader line pointing to the correct item. Derive labels conservatively from the supplied role or safe category, such as TOP, TROUSERS, SNEAKERS, BAG, KNIT POLO, WIDE TROUSERS, RUNNER SNEAKERS, HOBO BAG, DENIM JACKET, or LEATHER TOTE. Place annotations in surrounding negative space; never cover product details; do not place all labels in one unrelated text block. No Hangul, Korean characters, fake Korean text, long marketing copy, invented brand names, or speculative product details.
- Product Fidelity rule: Korean-inspired styling and annotations must not introduce unrelated products, change uploaded product identity, distort product scale, or invent accessories. Product Fidelity remains higher priority than graphic/text perfection.
- Forbidden elements: Korean model portrait, visible body/skin/face, mannequin, Hangul/Korean text, invented products, duplicated products, missing required products, copied reference-image products, severe product scale distortion, strong 3D invisible walking-body presentation resembling SK02, lost complete outfit relationship, independent product breakdown, generic catalog grid, long generated marketing copy.
- Post-generation QA: Hard fail if a visible real human appears; visible face or skin appears; required products are invented, substituted, or missing; severe product scale distortion occurs; a strong 3D invisible walking-body presentation resembles SK02; the complete outfit relationship is lost; the output becomes an independent product breakdown or generic catalog grid; or Hangul/Korean visible text appears. Soft revision if the top appears disproportionately large; trousers are disproportionately long or short; shoes are oversized or detached from the leg relationship; bag scale is too large or too small; the overall body ratio feels unnatural; a major product lacks its annotation; an annotation lacks a leader line; an annotation points to the wrong product; a product label is unnecessarily long; English typography is corrupted; annotations cover product details; sage atmosphere is too faint; or the composition still feels somewhat close to SK02.
- Reference image path: `examples/visual/06-korean-street-editorial.jpg`

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

01 = `SK01_MINIMAL_FLAT_LAY` 鈥?Minimal Flat Lay
骞插噣骞抽摵绌挎惌鍥撅紝閫傚悎鏁村鎼厤灞曠ず

02 = `SK02_INVISIBLE_EDITORIAL` — Clean Editorial Flat Lay
干净棚拍平铺穿搭图，单品关系清晰、留白克制。
03 = `SK03_LOOK_BREAKDOWN` 鈥?Look Breakdown
鏁村 Look + 鍗曞搧鎷嗚В璇存槑

04 = `SK04_PROP_STYLING` 鈥?Prop Styling
琛ｆ湇涓庢瀛愩€佸鍏锋垨灏忕墿涓€璧烽檲鍒?
05 = `SK05_JAPANESE_CATALOG` 鈥?Japanese Catalog
鏃ユ潅 / 鏃ョ郴鐩綍鎰熺┛鎼瑙?
06 = `SK06_KOREAN_STREET_EDITORIAL` 鈥?Korean Street Editorial
闊╃郴 / 棣栧皵琛楀ご缂栬緫鎰熺┛鎼浘

Users may refer to a visual style by:

- number
- English name
- short visual description

Examples:

- "Use 01"
- "Use 02"
- "Use Minimal Flat Lay"
- "Use Clean Editorial Flat Lay"
- "鐢?05 鏃ユ潅鐩綍鎰?
- "鐢?06 闊╃郴琛楀ご缂栬緫鎰?

Do not add complex auto-routing rules. Resolve simple user language to the fixed contract above.

## Canonical Contract Overrides Name Interpretation

The Skill name is only a human-friendly identifier. The canonical Visual Contract is authoritative.

The Agent must not reinterpret a Skill using its own general knowledge. For example:

- "Japanese Catalog" must not become a generic Japanese fashion model photograph. It must follow `SK05_JAPANESE_CATALOG`.
- "Korean Street Editorial" must not become any generic Korean street-fashion portrait. It must follow `SK06_KOREAN_STREET_EDITORIAL`.

Concise contrast:

- `SK02_INVISIBLE_EDITORIAL`: clean editorial flat lay, human-absent and clothing-only, with clear product separation and no invisible-body or mannequin structure.
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

When a Skill is selected, only that Skill's own Reference image path may be used as a visual presentation reference. All other packaged visual examples are for gallery browsing, user selection, and documentation only; they must not influence composition, scene, look, color, camera, or graphic treatment for the selected Skill.

Strict reference mapping:

- 01 may use only `examples/visual/01-minimal-flat-lay.jpg`
- 02 may use only `examples/visual/02-clean-editorial-flat-lay.png`
- 03 may use only `examples/visual/03-look-breakdown.jpg`
- 04 may use only `examples/visual/04-prop-styling.jpg`
- 05 may use only `examples/visual/05-japanese-catalog.png`
- 06 may use only `examples/visual/06-korean-street-editorial.jpg`

For Use 01, explicitly ignore `02-clean-editorial-flat-lay.png` and every other packaged Skill reference. For Use 02, explicitly ignore `01-minimal-flat-lay.jpg` and every other packaged Skill reference. Apply the same one-to-one isolation to 03, 04, 05, and 06.

If the host Agent supports using Skill package images as visual references, use only the selected Skill's mapped reference image to understand presentation style. The user's uploaded product images always have priority.

## Visual Contracts

### 01 鈥?Minimal Flat Lay

- ID: `SK01_MINIMAL_FLAT_LAY`
- Name: Minimal Flat Lay
- Short visual description: 骞插噣骞抽摵绌挎惌鍥撅紝閫傚悎鏁村鎼厤灞曠ず
- Intent: Realistic minimal flat-lay / laid-out outfit still life. The uploaded outfit is the primary subject, photographed as one believable casual arrangement rather than a cutout collage.
- Canonical presets: Scene `S01` White Studio; Composition `C02` Full Outfit Flat Lay; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No human model, no portrait, no visible body.
- Composition rule: True overhead or near top-down realistic flat lay; target an 85-90 degree downward camera angle; complete outfit visible; top above bottom; shoes positioned naturally near lower body area; accessories casually distributed if uploaded. Placement should feel casually but intentionally arranged, with mild overlap, rhythm, visual hierarchy, believable contact with the floor, soft-edged grounded shadows, and small arrangement imperfections. Products should not look too evenly separated, pasted on, floating, or disconnected.
- Scene rule: Natural indoor cement/concrete floor feeling close to the approved `01-minimal-flat-lay.jpg` presentation reference: slightly cooler clean neutral-grey concrete or cement floor, subtle natural floor texture, airy and clean but not empty-white studio backdrop, and no distracting architecture. Keep product colors faithful while cooling and cleaning only the environment.
- Look rule: Soft low-saturation natural daylight, slightly cooler clean neutral-grey environment, restrained contrast, soft-edged shadows, neutral white balance, accurate garment colors, and real editorial still-life photography feel. Avoid warm beige floor appearance, brownish-grey or muddy grey cast, dirty warm cement tone, yellow cast, overly contrasty floor texture, hard shadow, dramatic spotlight, side-angle fashion editorial feel, bright white seamless background, and pasted-on cutout feeling.
- Graphic rule: Add lightweight product information annotations using thin arrows or leader lines plus short 1-3 word English labels. The annotation style should feel direct, casual, and lifestyle still-life explanatory while the image remains realistic flat-lay photography rather than an information poster. Place labels in negative space, point each arrow to the correct product, and never cover product-defining details. Do not add a large poster headline, complex typography hierarchy, brand logos, URLs, prices, marketing copy, or non-English text.
- Product Fidelity rule: Preserve actual garment silhouettes, proportions, material, graphics, hardware, trims, and colors.
- Forbidden elements: portrait photography, fashion model photography, lifestyle street photography, unrelated room photography, pure white cutout canvas, floating graphic composition, sterile ecommerce background, rigid product grid, pasted-on compositing, disconnected evenly separated products, warm beige/yellow floor cast, brownish-grey or muddy grey cast, dirty warm cement tone, overly contrasty floor texture, hard spotlight, missing required products, invented products, poster title, dense information layout, SK02-style systematic editorial label grid, SK03 breakdown poster, SK04 chair/prop scene.
- Post-generation QA: Verify realistic minimal flat lay, true overhead/top-down camera feel, slightly cooler clean neutral-grey indoor cement/concrete floor, casual layered placement, believable floor contact and soft-edged grounded shadows, required products present, no model/body, product identity preserved, lightweight English arrow/leader-line annotations point to the correct products, labels do not cover key details, and no unrequested non-English text appears. Soft revision if the floor reads too white instead of natural concrete, floor reads too warm/beige, floor reads brownish-grey/muddy, cement tone feels dirty-warm, lighting is too hard, image is too yellow, floor texture is overly contrasty, camera is not top-down enough, surface feels too sterile or graphic, placement is too evenly separated, flat lay feels pasted rather than photographed, labels are too large, labels cover product details, arrows point to the wrong item, or the annotation layer feels like a poster.
- Reference image path: `examples/visual/01-minimal-flat-lay.jpg`

### 02 — Clean Editorial Flat Lay

- ID: `SK02_INVISIBLE_EDITORIAL`
- Name: Clean Editorial Flat Lay
- Short visual description: 干净棚拍平铺穿搭图，单品关系清晰、留白克制。
- Intent: Clean editorial flat-lay outfit presentation. The uploaded outfit is arranged as a polished, human-absent product still life on a pale neutral studio surface with clear product separation and restrained editorial spacing.
- Canonical presets: Scene `S01` White Studio; Composition `C02` Full Outfit Flat Lay; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human face, no visible human skin, no visible identifiable human model, no mannequin, no human silhouette, and no implied invisible-body structure.
- Composition rule: Clean editorial flat-lay outfit arrangement. Place uploaded products on a light neutral studio surface with cleaner, tidier, more orderly, and more controlled placement than SK01. Each major product should read clearly as its own item, with clear product separation, deliberate spacing, neat alignment, simple hierarchy, subtle contact shadows, and polished negative space. Preserve one complete outfit relationship: top or outer as the upper visual anchor, trousers as the dominant lower-body item, shoes grouped naturally near the lower area, and bag placed nearby with minimal and deliberate overlap only when it improves hierarchy. Keep the layout shallow, flat, curated, and editorial rather than casually dropped, loosely scattered, naturally messy, or overly relaxed.
- Scene rule: Clean white, soft grey, or very pale neutral studio floor/background with smooth or very light texture, simple editorial studio feel, generous negative space, and minimal visual distraction. SK02 should be cleaner, tidier, more controlled, and more product-separated than SK01, without SK01's cement-floor realism, strong concrete texture, or casual concrete-floor arrangement language. Avoid furniture, room architecture, lifestyle clutter, prop styling, catalog graphics, Korean callouts, warm beige cast, and strong colored environmental cast.
- Look rule: Soft clean studio daylight, subtle contact shadows, low-to-medium contrast, pale neutral studio palette, accurate product color, restrained warmth, and polished premium editorial still-life mood. Avoid hard spotlight, heavy warm cast, icy sterile cast, concrete-grey dominance, and ecommerce cutout flatness.
- Graphic rule: Add a clean editorial outfit information layout. A restrained top title such as `OUTFIT NOTES`, `EDITED LOOK`, or `MONTHLY OUTFIT` may appear, with systematic product information labels around the items. Use a clearer text hierarchy than SK01: category or neutral product name as the primary line, optional short description as the secondary line, and simple thin leader lines pointing to the correct products. Keep all visible text in English, concise, and generic; do not copy reference-image brand names, website addresses, logos, months, or slogans. The information layer should be polished and controlled, but SK02 must not become SK03 product breakdown, SK05 catalog layout, or SK06 Korean callout editorial.
- Product Fidelity rule: Clean editorial flat-lay styling must not redesign, replace, simplify, recolor, duplicate, or invent uploaded products.
- Forbidden elements: ordinary model photography, visible skin, visible face, identifiable human model, mannequin, invisible-body structure, body-shaped outfit arrangement, 3D human-body structure, implied anatomy, body occupancy, human silhouette, walking pose, standing pose, reclining body form, missing required products, invented products, duplicated products, substituted products, distorted shoes, SK06-like flat 2D human-silhouette presentation, product breakdown, SK04 prop-styling scene, SK05 catalog graphics, Korean callout editorial, furniture, decorative props, room architecture, lifestyle clutter, cement-floor realism, strong concrete texture, warm beige cast, strong colored backdrop, elaborate set design, clutter, pure white cutout canvas, sterile ecommerce grid, casual layered still-life feeling, natural relaxed scattering, thrown-down styling, excessive overlap, products floating too far apart, hard spotlight, overly warm/yellow lighting, icy blue cast, overly cozy room tone, copied brand names, copied URLs, copied logos, copied months, marketing slogans, non-English visible text.
- Post-generation QA: Verify clean editorial flat-lay presentation, no visible human, no invisible-body/mannequin structure, required products present, each major product reads clearly, product separation is clearer than SK01, spacing is deliberate, overlap is minimal, hierarchy is simple, subtle contact shadows are controlled, pale neutral studio surface is preserved, product identity is preserved, a restrained English top title or information row is present, product labels use generic English category/name plus optional short description, leader lines point to the correct products, and no unrequested non-English text appears. Hard fail if a human appears, an invisible-body/mannequin/body-shaped arrangement appears, required products are invented/missing/substituted/duplicated, furniture or prop styling dominates, the output becomes SK03/SK04/SK05/SK06, copied brands/URLs/logos/months appear, or Product Fidelity is violated. Soft revision if the background is too warm, overlap is excessive, products are too far apart, arrangement is too rigid or too casually scattered, scene is too textured or concrete-like, negative space is insufficient, shadows are too hard, result looks too similar to SK01, information hierarchy is unclear, labels are too dense, or leader lines point to the wrong item.
- Reference image path: `examples/visual/02-clean-editorial-flat-lay.png`

### 03 — Look Breakdown

- ID: `SK03_LOOK_BREAKDOWN`
- Name: Look Breakdown
- Short visual description: 整套 Look + 单品拆解说明
- Intent: Direct look guide / gift guide / styling breakdown showing one main look plus a clear numbered item breakdown.
- Canonical presets: Scene `S01` White Studio; Composition `C05` Model + Item Breakdown; Graphic `G01` Minimal Label; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: at least 3 valid user-provided product/outfit references.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: A primary visual may be model-based or outfit-based; do not force a human model. If a model-based main look is used, do not show a clear visible face or recognizable facial features. Prefer crop below chin, head out of frame, or back/side-back framing without a clear side face so the outfit remains the focus.
- Composition rule: One primary styled look plus separate clothing pieces and accessories displayed around or beside it; clear hierarchy, generous negative space. The main look must remain present but should not overpower the item breakdown area. The breakdown area should read as a fashion item breakdown / look guide / gift guide with clear product zones and visible numbered items such as `01`, `02`, `03`, and `04`.
- Scene rule: Clean warm-white seamless studio with minimal continuous surface.
- Look rule: High-key diffused studio lighting, neutral white balance, clean catalog clarity.
- Graphic rule: Minimal English editorial typography, clear item numbers, thin restrained sans-serif labels, short English product titles, and at most one very short descriptor line per item. Keep the information hierarchy clean and scannable; avoid long paragraphs.
- Product Fidelity rule: Do not copy products from the Skill reference image; use only user-provided products and preserve them.
- Forbidden elements: copied reference-image products, invented missing products, clear visible face, recognizable facial features, portrait-focused model, non-English generated labels, long catalog paragraphs, cluttered poster layout, poster-style branding layout, SK05 calm catalog page, SK06 Korean poster, SK01/SK02/SK04 flat-lay-only composition, wrong Skill/output type.
- Post-generation QA: Verify at least 3 user products, a main look, separated item breakdown, no clear face or recognizable facial features in the main look, numbered product breakdown, short English labels, clean information hierarchy, English-only visible text, product identity preserved, and no long catalog paragraphs.
- Reference image path: `examples/visual/03-look-breakdown.jpg`

### 04 鈥?Prop Styling

- ID: `SK04_PROP_STYLING`
- Name: Prop Styling
- Short visual description: 琛ｆ湇涓庢瀛愩€佸鍏锋垨灏忕墿涓€璧烽檲鍒?- Intent: Product-first still life where outfit pieces are styled with supporting props or physical context.
- Canonical presets: Scene `S01` White Studio; Composition `C03` Chair / Object Styling; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom` and at least one of `top` or `outer`.
- Recommended inputs: `shoes`, `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human model is required; keep the focus on outfit/object styling.
- Composition rule: Outfit naturally arranged on or around one visually dominant hero chair or similarly simple hero prop; slightly surreal is allowed only when physically believable. The outfit must interact naturally with the single anchor and form a subtle human-presence display: garments may be supported, draped, or positioned so the outfit suggests a wearable human outline through the chair and product relationships, while remaining product-first. Trousers may fall from the seat, tops may imply an upper torso shape through drape and support, bags may hang from or rest against it, and shoes should ground the implied stance. Avoid simply placing independent products around a prop; the prop should organize the outfit spatially without distorting uploaded products. Do not add secondary furniture or prop clusters, visible body parts, face, skin, a full mannequin, or a strong 3D invisible-person effect.
- Scene rule: Clean grey-white studio wall/floor close to the approved `04-prop-styling.jpg` presentation reference: simple light neutral backdrop, indoor studio feeling, clean minimal quiet interior, generous negative space, restrained premium materials, and one dominant chair as the spatial anchor. The outfit + chair relationship must remain clear. Tiny styling details are acceptable only if they do not read as additional furniture. Avoid cement-wall or concrete-room feeling, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architecture, warm yellow room tone, orange cast, overly cozy mood, or prop-heavy storytelling.
- Look rule: Soft diffused daylight, gentle grounded shadows, grey-white studio palette, clean cool-neutral tone, low saturation, slightly desaturated color, restrained premium mood, and quiet indoor editorial studio mood. Avoid hard spotlight, theatrical contrast, cement/concrete-room dominance, orange cast, and vintage warm filter.
- Graphic rule: Add one small top information row made of concise English product notes, optionally grouped by item. The top row is supplemental and must not overpower the prop-styling image. Use restrained editorial typography with no large poster headline, no URLs, no brand logos, no prices, no marketing slogan, and no non-English text. Product notes must remain accurate to the uploaded items and must not cover the outfit or hero prop.
- Product Fidelity rule: Props support the products; they must not obscure, replace, dominate, or distort uploaded outfit references. Prop fidelity must never override Product Fidelity.
- Forbidden elements: no meaningful prop/object relationship, generic flat lay, product breakdown, catalog grid, prop becomes main subject, cement-wall or concrete-room atmosphere, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architectural backgrounds, prop-heavy storytelling, warm yellow room tone, orange cast, overly cozy mood, hard spotlight, theatrical contrast, invented fashion products, copied reference-image props as products, missing required products, impossible fabric contact, real human, face, skin, full mannequin, strong 3D invisible-person body, large poster headline, top information row covering products.
- Post-generation QA: Verify required products present, product remains primary, one hero chair/prop is clearly dominant, the outfit/prop spatial relationship is natural, the arrangement suggests a wearable human outline without showing a real human/skin/face/mannequin, props support composition, product identity preserved, clean grey-white studio wall/floor scene fidelity, and a small English top information row is present without overpowering or covering products. Hard fail if there is no meaningful prop/object relationship; the output becomes a generic flat lay, product breakdown, catalog grid, SK02 separated flat lay, SK06 flat silhouette, or strong 3D invisible-person body; the scene dominates so strongly that outfit styling becomes secondary; a real human/skin/face/mannequin appears; or Product Fidelity is violated. Soft revision if the background reads as cement wall/concrete room, additional cabinet/shelf/table appears, background has unnecessary furniture, the scene becomes too architectural, negative space is reduced by extra objects, background is too warm, interior feels too cozy/yellow, lighting is too hard, result lacks the clean light neutral studio tone of reference 04, there are too many props, multiple furniture pieces compete, the room is too decorative, the hero prop is not clearly dominant, the outfit/prop relationship is weak, the human-presence outline is missing or too strong, top information text is too large, or unnecessary lifestyle clutter appears.
- Reference image path: `examples/visual/04-prop-styling.jpg`

### 05 鈥?Japanese Catalog

- ID: `SK05_JAPANESE_CATALOG`
- Name: Japanese Catalog
- Short visual description: 鏃ユ潅 / 鏃ョ郴鐩綍鎰熺┛鎼瑙?- Intent: Japanese lifestyle catalog-inspired clothing presentation with quiet, soft, clean, paper-like calm and English-only typography. This is not generic Japanese model photography and must not generate Japanese text.
- Canonical presets: Scene `S05` Warm Off-white; Composition `C02` Full Outfit Flat Lay; Graphic `G04` Japanese Catalog; Look `L05` Warm Vintage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: Follow the canonical clothing/product presentation; do not replace it with generic model photography.
- Composition rule: Full outfit flat lay or near-flat catalog presentation; complete outfit visible; precise editorial order, readable product arrangement, gentle whitespace, and quiet lifestyle catalog rhythm. It may keep a flat or near-flat outfit relationship, but must not become SK03's numbered breakdown board or SK06's Korean independent-brand poster.
- Scene rule: Warm off-white studio, creamy neutral background, minimal editorial space, soft paper-like or plaster-like surface, quiet catalog calm, gentle whitespace, and low visual pressure.
- Look rule: Soft low-contrast light, warm off-white highlights, slightly faded earthy tones, fine analog grain, restrained vintage catalog mood.
- Graphic rule: English editorial fashion catalog typography inspired by Japanese lifestyle magazine layout; small English headings, short English labels, brief English notes, precise alignment, generous white space, and quiet editorial pacing. All newly generated visible text must be English only. No Japanese characters, kana, kanji, fake Japanese text, pseudo-Japanese marks, Japanese-style gibberish, Hangul, Korean text, poster slogans, or dense breakdown numbering.
- Product Fidelity rule: Catalog styling and typography must not cover, modify, or replace product-defining details.
- Forbidden elements: generic Japanese model portrait, Japanese text, kana, kanji, fake Japanese text, pseudo-Japanese marks, arbitrary Japanese typography, Hangul, Korean text, Korean independent-brand poster, streetwear poster, SK03 numbered breakdown board, gift guide, campaign poster, dense product board, long catalog paragraphs, invented products, missing required products, copied reference-image products.
- Post-generation QA: Verify full outfit flat lay/catalog composition, calm Japanese catalog feeling, soft editorial layout, English-only visible text, no Japanese characters or fake Japanese glyphs, no Korean text, no poster-style branding, no breakdown board, and product identity preserved.
- Reference image path: `examples/visual/05-japanese-catalog.png`

### 06 鈥?Korean Street Editorial

- ID: `SK06_KOREAN_STREET_EDITORIAL`
- Name: Korean Street Editorial
- Short visual description: 闊╃郴 / 棣栧皵琛楀ご缂栬緫鎰熺┛鎼浘
- Intent: Korean independent-brand / Seoul editorial poster with a flat 2D human-silhouette outfit composition. The garments form one complete human-shaped Look while remaining visually flat, graphic, poster-like, and distinct from SK02's clean separated studio flat lay, SK03's item breakdown board, and SK05's calm Japanese catalog page.
- Canonical presets: Scene `S02` Dusty Sage; Composition `C04` Dynamic Invisible Outfit; Graphic `G02` Korean Street; Look `L01` Dusty Sage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human face, no visible skin, no real model, and no mannequin. Avoid strong three-dimensional invisible-person body, walking-body anatomy, and mannequin realism; SK06 should stay flat, graphic, clothing-only, and proportionally human-shaped.
- Composition rule: Use C04 as a base for a flat human-silhouette Korean independent-brand poster. Preserve one coherent head-to-toe outfit relationship: top or outer above bottom, bottom connected to the leg area, shoes near the implied feet, optional hat near the head position, optional glasses near the face/head position, bag at the shoulder/body side or slightly offset, and accessories associated with their natural styling positions. Flatness refers to depth, not incorrect scale: preserve believable full-outfit human proportions, including upper-body scale, waist placement, bottom length, shoe size, bag scale, and accessory scale. Treat the complete outfit as the primary poster subject before scaling individual products. Prefer flattened garment presentation, low depth, low perspective, graphic silhouette, restrained garment volume, clean overall outline, complete outfit readability, and stronger poster setup than a generic flat lay. A few minor supporting props are allowed only if they strengthen the independent-brand poster setup and remain secondary.
- Scene rule: Muted dusty sage green or dusty green poster background, clean independent-brand setup, graphic negative space, quiet minimal editorial environment, large negative space, and controlled poster balance.
- Look rule: Soft diffused studio lighting, low saturation, muted sage-green cast, matte soft contrast, fine analog grain.
- Graphic rule: Korean independent-brand poster structure is required. Use a generic fictional logo-like English title at the top, a short setup/look title near the upper or middle area, white hand-drawn-style product callouts with thin leader lines for every major displayed product, and a very short poster-style tagline near the bottom. Each major product should receive a small index number and a short 1-3 word English product label derived conservatively from the supplied role or safe category. Place annotations in surrounding negative space; never cover product details. All visible text must be English-only, generic, and fictional. No Hangul, Korean characters, fake Korean text, Japanese text, real brand names, long marketing copy, or speculative product details.
- Product Fidelity rule: Korean-inspired styling and annotations must not introduce unrelated products, change uploaded product identity, distort product scale, or invent accessories. Product Fidelity remains higher priority than graphic/text perfection.
- Forbidden elements: Korean model portrait, visible body/skin/face, mannequin, mannequin realism, strong 3D invisible-person body, walking-body anatomy, Hangul/Korean text, Japanese text, real brand names, invented products, duplicated products, missing required products, copied reference-image products, severe product scale distortion, clean separated studio flat lay, SK03 item breakdown board, SK05 calm Japanese catalog page, lost complete outfit relationship, independent product breakdown, generic catalog grid, long generated marketing copy, dense catalog paragraphs.
- Post-generation QA: Hard fail if a visible real human appears; visible face or skin appears; required products are invented, substituted, or missing; severe product scale distortion occurs; a strong 3D invisible-person body or walking-body anatomy appears; the complete outfit relationship is lost; the output becomes a clean separated studio flat lay, SK03 item breakdown board, SK05 calm Japanese catalog page, independent product breakdown, or generic catalog grid; Hangul/Korean/Japanese visible text appears; or the poster structure omits title/setup/callouts/tagline. Soft revision if the top appears disproportionately large; trousers are disproportionately long or short; shoes are oversized or detached from the leg relationship; bag scale is too large or too small; the overall body ratio feels unnatural; a major product lacks its white hand-drawn annotation; an annotation lacks a leader line; an annotation points to the wrong product; a product label is unnecessarily long; English typography is corrupted; annotations cover product details; sage atmosphere is too faint; title/setup/tagline hierarchy is weak; or the composition still feels too close to a clean separated studio flat lay, breakdown board, or catalog page.
- Reference image path: `examples/visual/06-korean-street-editorial.jpg`

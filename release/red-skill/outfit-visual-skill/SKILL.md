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
- Graphic rule: Add lightweight product information annotations using thin arrows or leader lines plus short English labels in Title Case. Restore the richer approved 01 annotation feeling: slightly more descriptive than bare category names, with optional short supporting descriptors such as `Knit Polo / Soft Textured Knit`, `Burgundy Bag / Glossy Soft Leather`, `Wide Trousers / Relaxed Denim`, or `Runner Sneakers / Retro Low Profile`. The annotation style should feel direct, casual, lively, and lifestyle still-life explanatory while the image remains realistic flat-lay photography rather than an information poster. Place labels in negative space, point each arrow to the correct product, and never cover product-defining details. Do not use all-caps for every product name; do not add a large poster headline, complex typography hierarchy, brand logos, URLs, prices, long marketing copy, or non-English text.
- Product Fidelity rule: Preserve actual garment silhouettes, proportions, material, graphics, hardware, trims, and colors.
- Forbidden elements: portrait photography, fashion model photography, lifestyle street photography, unrelated room photography, pure white cutout canvas, floating graphic composition, sterile ecommerce background, rigid product grid, pasted-on compositing, disconnected evenly separated products, warm beige/yellow floor cast, brownish-grey or muddy grey cast, dirty warm cement tone, overly contrasty floor texture, hard spotlight, missing required products, invented products, poster title, dense information layout, all-caps-only product naming, SK02-style systematic editorial label grid, SK03 breakdown poster, SK04 chair/prop scene.
- Post-generation QA: Verify realistic minimal flat lay, true overhead/top-down camera feel, slightly cooler clean neutral-grey indoor cement/concrete floor, casual layered placement, believable floor contact and soft-edged grounded shadows, required products present, no model/body, product identity preserved, lightweight English arrow/leader-line annotations point to the correct products, Title Case labels do not cover key details, optional short descriptors remain concise, and no unrequested non-English text appears. Soft revision if the floor reads too white instead of natural concrete, floor reads too warm/beige, floor reads brownish-grey/muddy, cement tone feels dirty-warm, lighting is too hard, image is too yellow, floor texture is overly contrasty, camera is not top-down enough, surface feels too sterile or graphic, placement is too evenly separated, flat lay feels pasted rather than photographed, labels are too large, labels cover product details, arrows point to the wrong item, product names are all-caps-only, or the annotation layer feels like a poster.
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

### 04 鈥?Prop Styling

- ID: `SK04_PROP_STYLING`
- Name: Prop Styling
- Short visual description: 琛ｆ湇涓庢瀛愩€佸鍏锋垨灏忕墿涓€璧烽檲鍒?- Intent: Product-first still life where outfit pieces are styled with supporting props or physical context.
- Canonical presets: Scene `S01` White Studio; Composition `C03` Chair / Object Styling; Graphic `None`; Look `L02` Clean White; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom` and at least one of `top` or `outer`.
- Recommended inputs: `shoes`, `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human model is required; keep the focus on outfit/object styling.
- Composition rule: Outfit naturally arranged on or around one visually dominant hero chair or similarly simple hero prop; slightly surreal is allowed only when physically believable. Interpret the SK04 reference as a chair-supported product display system. The chair is a styling prop, display support, flat structural support, and garment support. It is not a hidden torso, pelvis, hips, thighs, knees, calves, legs, seated body, standing body, or mannequin. The result should read as garments arranged on a chair as a fashion display, not as an invisible person sitting in the clothes. Human-referential reading is allowed only through garment order and outfit relationship, not body shape, human pose, or body posture. Garments must remain empty, unworn, non-inflated, and product-like. All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the chair, contact with the floor, or contact with other products; never from hidden human anatomy. Tops or inner tops may rest over the chair back, wrap lightly around chair edges, hang naturally from chair contact, or be supported by the chair while staying visibly empty, following fabric gravity with no chest volume, torso cavity, stretched shoulder anatomy, hidden torso, or worn-body tension. If an outer garment exists, layer it naturally over or around the top, or drape it over the chair back or side, without invisible shoulder/body volume or mannequin-like jacket structure. Trousers must be laid or draped from the chair seat or seat edge: the waistband may rest on the chair seat or edge, and the legs may drape downward naturally, collapse, flatten, twist, fold, or pool with folds created by fabric weight, denim stiffness, garment cut, gravity, chair contact, and natural bunching. Natural garment volume is allowed; human anatomical volume is not. Trousers must stay empty and must not form two clean anatomical leg tubes, inflated trouser legs, hidden thigh shapes, hidden knee shapes, calf volume, pelvis or hip anatomy, sitting-leg anatomy, or a seated-body pose. Bags may hang from or rest against the chair as an independent product, not as if carried by an invisible shoulder or arm. Shoes should stay product-like near the chair or lower composition area, naturally grouped, and not aligned as invisible feet or forced into SK06 standing-pose logic. Avoid simply placing independent products around a prop; the prop should organize the outfit spatially without distorting uploaded products. Do not add secondary furniture or prop clusters, visible body parts, face, skin, a full mannequin, hidden mannequin, chest volume, pelvis volume, hip volume, thigh volume, knee volume, calf volume, body-inflated garment tension, seated invisible-person structure, standing silhouette, or a strong 3D invisible-person effect.
- Scene rule: Clean grey-white studio wall/floor close to the approved `04-prop-styling.jpg` presentation reference: cool grey-white palette, simple light neutral backdrop, seamless quiet wall/floor relationship, indoor studio feeling, clean premium quiet interior, generous negative space, restrained premium materials, soft even ambient studio light, diffuse lighting, very low directional-light drama, minimal shadow pattern, and one dominant chair as the spatial anchor. The outfit + chair relationship must remain clear. Tiny styling details are acceptable only if they do not read as additional furniture. Avoid rough cement room feeling, industrial concrete-wall dominance, cement-wall or concrete-room atmosphere, visible sunbeam, window-light streak, diagonal light patch, dramatic floor shadow, warm sunlight, editorial cinematic side light, sunlight entering from a window, spotlight, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architecture, warm yellow room tone, warm beige, orange cast, overly cozy mood, or prop-heavy storytelling.
- Look rule: Soft even ambient studio light, diffuse lighting, restrained contrast, minimal shadow pattern, cool grey-white studio palette, clean slightly cool-neutral tone, low saturation, slightly desaturated color, restrained premium mood, and quiet indoor editorial studio mood. Avoid visible sunbeam, window-light streak, diagonal light patch, dramatic floor shadow, warm sunlight, editorial cinematic side light, hard spotlight, theatrical contrast, cement/concrete-room dominance, warm beige, orange cast, and vintage warm filter.
- Graphic rule: Add one small top information row made of concise English product notes, optionally grouped by item. The top row is supplemental and must not overpower the prop-styling image. Use restrained editorial typography with no large poster headline, no URLs, no brand logos, no prices, no marketing slogan, and no non-English text. Product notes must remain accurate to the uploaded items and must not cover the outfit or hero prop.
- Product Fidelity rule: Props support the products; they must not obscure, replace, dominate, or distort uploaded outfit references. Prop fidelity must never override Product Fidelity.
- Forbidden elements: no meaningful prop/object relationship, generic flat lay, product breakdown, catalog grid, prop becomes main subject, rough cement room feel, industrial concrete-wall dominance, cement-wall or concrete-room atmosphere, visible sunbeam, window-light streak, diagonal light patch, dramatic floor shadow, warm sunlight, editorial cinematic side light, spotlight, shelves, cabinets, side tables, extra pedestals unless absolutely required, multiple competing furniture pieces, decorative prop collections, cluttered tabletop styling, excessive lifestyle objects, complex room decoration, decorative architecture, busy architectural backgrounds, prop-heavy storytelling, warm yellow room tone, warm beige, orange cast, overly cozy mood, hard spotlight, theatrical contrast, invented fashion products, copied reference-image props as products, missing required products, impossible fabric contact, real human, face, skin, full mannequin, hidden mannequin, chair acting like a torso/pelvis/thighs/legs, invisible body volume inside garments, chest/waist/thigh/knee/calf volume, inflated trousers, rounded leg tubes, hidden knee or calf anatomy, seated invisible-person structure, strong 3D invisible-person body, SK06-style standing silhouette, bag carried by an invisible body, shoes positioned as invisible feet, large poster headline, top information row covering products.
- Post-generation QA: Verify required products present, product remains primary, one hero chair/prop is clearly dominant as a display support, the outfit/prop spatial relationship is natural, the arrangement is human-referential only through garment order and chair-supported display logic without resolving into a real human/skin/face/mannequin, invisible seated person, full human silhouette, or body anatomy, props support composition, product identity preserved, tops stay empty without chest/torso volume, trousers drape from fabric gravity and chair contact without pelvis/hip/thigh/knee/calf anatomy, shoes remain product placement rather than invisible feet, bag remains independent product styling rather than being carried, clean premium cool grey-white studio wall/floor scene fidelity, soft even ambient studio lighting, no visible sunbeam/window-light streak/diagonal light patch/dramatic floor shadow/warm sunlight, and a small English top information row is present without overpowering or covering products. Hard fail if garments look worn by an invisible seated person; top has obvious chest/body volume; pants have pelvis/hip/thigh/knee/calf anatomy; hidden mannequin structure is implied; trouser legs are inflated instead of naturally draped; bag appears carried by invisible body; shoes act as invisible feet; the output becomes SK06-style standing silhouette, generic flat lay, product breakdown, catalog grid, or SK02 separated flat lay; scene gains extra furniture clutter; warm sunbeam or dramatic directional light returns; a real human/skin/face/mannequin appears; or Product Fidelity is violated. Soft revision if pants folds look too posed, chair role feels weak, top is too stiff, bag placement feels disconnected, shoes feel too detached, background reads as cement wall/concrete room, visible directional sunlight appears, window-light streaks appear, a diagonal light patch appears, dramatic floor shadows appear, additional cabinet/shelf/table appears, background has unnecessary furniture, the scene becomes too architectural, negative space is reduced by extra objects, background is too warm, interior feels too cozy/yellow, lighting is too hard, result lacks the clean premium cool neutral studio tone of reference 04, there are too many props, multiple furniture pieces compete, the room is too decorative, the hero prop is not clearly dominant, top information text is too large, or unnecessary lifestyle clutter appears.
- Reference image path: `examples/visual/04-prop-styling.jpg`

### 05 鈥?Japanese Catalog

- ID: `SK05_JAPANESE_CATALOG`
- Name: Japanese Catalog
- Short visual description: Japanese magazine/catalog-inspired outfit visual.
- Intent: Japanese magazine/catalog-inspired clothing presentation with a warm lifestyle magazine page layout. English is the primary product-information language, with limited short Japanese editorial accent text allowed. This is not generic Japanese model photography and not a technical product-detail board.
- Canonical presets: Scene `S05` Warm Off-white; Composition `C02` Full Outfit Flat Lay; Graphic `G04` Japanese Catalog; Look `L05` Warm Vintage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: Follow the canonical clothing/product presentation; do not replace it with generic model photography.
- Composition rule: Full outfit flat lay/catalog presentation; complete outfit visible; precise editorial order and readable product arrangement. The main outfit composition remains dominant, with product descriptions integrated into the page, tasteful numbered product references if useful, side notes, gentle spacing, and calm magazine hierarchy. Do not create a vertical column of multiple product zoom/detail boxes, cropped close-up thumbnails, technical detail panels, spec-sheet modules, or breakdown-board structure.
- Scene rule: Warm off-white studio, creamy neutral background, minimal editorial space, soft paper-like or plaster-like surface.
- Look rule: Soft low-contrast light, warm off-white highlights, slightly faded earthy tones, fine analog grain, restrained vintage catalog mood.
- Graphic rule: Japanese lifestyle magazine/catalog typography with English as the primary product-information language, elegant product descriptions, precise alignment, generous white space, refined margins, and warm editorial hierarchy. Small amounts of short Japanese editorial accent text are allowed as decorative magazine language, but Japanese must be limited, visually integrated, and not dominant. Do not generate large blocks of Japanese text, unreadable Japanese-like noise, fake brand names, URLs, logos, vertical product zoom/detail-box columns, multiple cropped close-up thumbnails, technical detail panels, or spec-sheet feeling.
- Product Fidelity rule: Catalog styling and typography must not cover, modify, or replace product-defining details.
- Forbidden elements: generic Japanese model portrait, large blocks of Japanese text, unreadable Japanese-like noise, arbitrary Japanese typography, invented products, missing required products, copied reference-image products, product zoom/detail-box column, multiple cropped close-up thumbnails, technical detail panels, spec-sheet feeling, breakdown-board feeling.
- Post-generation QA: Verify full outfit flat lay/catalog composition, Japanese magazine/catalog page language, main outfit remains dominant, English product information is readable, any Japanese accent text is limited and visually integrated, no product zoom/detail-box column appears, no technical detail paneling appears, and product identity is preserved.
- Reference image path: `examples/visual/05-japanese-catalog.png`

### 06 鈥?Korean Street Editorial

- ID: `SK06_KOREAN_STREET_EDITORIAL`
- Name: Korean Street Editorial
- Short visual description: 闊╃郴 / 棣栧皵琛楀ご缂栬緫鎰熺┛鎼浘
- Intent: Korean independent-brand / Seoul editorial with flat products arranged in normal wearing order. The garments form one complete Look through product placement, wearing-order hierarchy, coordinated directions, and pose energy only while remaining laid flat, empty, unworn, non-inflated, graphic, and distinct from SK02's clean separated studio flat lay. This is not generic Korean model portrait photography, not random decorative product placement, not invisible-person styling, and not clothing worn by a hidden body.
- Canonical presets: Scene `S02` Dusty Sage; Composition `C04` Dynamic Invisible Outfit; Graphic `G02` Korean Street; Look `L01` Dusty Sage; Aspect ratio `3:4`; Quality `standard`; Product Fidelity `ON`.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Recommended inputs: `hat`, `socks`, `bag`, `glasses`, `accessory01`, `accessory02`, `prop01`, `prop02`.
- Human presence rule: No visible human face, no visible skin, no real model, and no mannequin. Avoid strong three-dimensional body illusion, standing invisible-person styling, worn-body presentation, hidden standing body, or shoes posed like invisible feet; SK06 should stay flat, graphic, and human-like only through wearing-order arrangement.
- Composition rule: Use C04 as a base for a flat outfit arranged in normal wearing order, not as SK02's clean separated studio flat lay, not as SK04 chair-supported display, and not as a product breakdown. Follow strict wearing-order arrangement logic: top or outer at the upper-body position; bottom directly below with a believable waist-to-hem relationship; shoes at the bottom as the end of the outfit; both shoe toes coordinated in one pose direction and visually continuing the trouser-leg directions; bag placed as an accessory near the upper-body or shoulder side, not floating as an isolated product. Preserve one coherent laid-out Look relationship before optimizing individual products. The overall outfit may suggest a standing person through order and placement only, but it must not simulate a standing body. Pose feeling may come from slight angle between top and trousers, subtle asymmetry, offset product placement, coordinated leg directions, bag position, and shoe direction. Pose feeling must not come from body volume. Top, trousers, bag, and shoes must remain laid out, staged, flat, empty, unworn, non-inflated, and product-like. All 3D form must come from fabric weight, garment cut, material stiffness, gravity, natural folds, contact with the floor, or contact with other products; never from hidden human anatomy. The garments are not worn, do not contain an internal body, and must not look like a standing invisible model. Trousers must stay flat and empty with no hidden hips, pelvis, thigh anatomy, knee anatomy, calf anatomy, inflated leg tubes, or anatomy-shaped leg volume. Shoes are staged products, not worn feet. Treat the complete outfit as the primary composition unit before scaling individual products, and maintain useful negative space around the complete Look. Prefer flattened garment presentation, low depth, low perspective, graphic silhouette, restrained natural garment volume, clean overall outline, complete outfit readability, and more pose energy than a simple straight flat lay without becoming worn-body styling. Controlled small offsets are allowed, but do not scatter garments into independent product tiles, random flat-lay placement, or a product breakdown.
- Scene rule: Muted dusty sage green seamless studio background, quiet minimal editorial environment, large negative space.
- Look rule: Soft diffused studio lighting, low saturation, muted sage-green cast, matte soft contrast, fine analog grain.
- Graphic rule: English-only Korean independent-brand / Seoul editorial annotations are required for every major displayed product. Restore the approved hand-drawn callout feeling: white hand-drawn arrows, white hand-drawn product numbers, relaxed handwritten English product names, and a casual independent-brand sketch tone. Each major product should receive a small index number, a short 1-3 word English product label, and a white hand-drawn-style leader line pointing to the correct item. Derive labels conservatively from the supplied role or safe category, such as TOP, TROUSERS, SNEAKERS, BAG, KNIT POLO, WIDE TROUSERS, RUNNER SNEAKERS, HOBO BAG, DENIM JACKET, or LEATHER TOTE. Place annotations in surrounding negative space; never cover product details; do not place all labels in one unrelated text block. No Hangul, Korean characters, fake Korean text, long marketing copy, invented brand names, or speculative product details.
- Product Fidelity rule: Korean-inspired styling and annotations must not introduce unrelated products, change uploaded product identity, distort product scale, or invent accessories. Product Fidelity remains higher priority than graphic/text perfection.
- Forbidden elements: Korean model portrait, visible body/skin/face, mannequin, Hangul/Korean text, invented products, duplicated products, missing required products, copied reference-image products, severe product scale distortion, standing invisible-person presentation, hidden standing body, worn-body presentation, shoes posed like invisible feet, strong 3D walking-body presentation, internal body volume inside garments, chest volume caused by hidden torso, pelvis/hip anatomy, thigh anatomy, knee anatomy, calf anatomy, inflated trouser legs, clothing tension caused by hidden body, rigid straight-line flat lay, simple product flat lay with no pose, clean separated studio flat lay, random flat-lay scattering, accessory placement with no wearing-order logic, lost top-to-trouser-to-shoe hierarchy, bag floating as a disconnected product tile, lost complete outfit relationship, independent product breakdown, generic catalog grid, long generated marketing copy, randomly opposing shoe directions, shoes detached from the wearing-order relationship.
- Post-generation QA: Hard fail if a visible real human appears; visible face or skin appears; required products are invented, substituted, or missing; severe product scale distortion occurs; a standing invisible-person, hidden standing body, or worn-body presentation appears; shoes look worn by invisible feet; strong 3D walking-body presentation appears; garments gain chest/hip/thigh/knee/calf anatomy or inflated body volume; the complete flat laid-out outfit relationship is lost; top/bottom/shoes do not follow wearing order; the bag floats without upper-body/shoulder relationship; the output becomes a random flat lay, clean separated studio flat lay, independent product breakdown, generic catalog grid, or rigid straight-line flat lay with no pose; or Hangul/Korean visible text appears. Soft revision if the wearing-order pose feeling is too weak; product order is unclear; leg direction is weak; products feel like simple flat lay tiles; top-to-trouser-to-shoe hierarchy is weak; the top appears disproportionately large; trousers are disproportionately long or short; shoes are oversized or detached from the flat wearing-order relationship; shoe toes point in random opposing directions; shoes do not visually continue the trouser-leg directions; bag scale is too large or too small; bag placement feels isolated rather than accessory-like; a major product lacks its annotation; an annotation lacks a leader line; an annotation points to the wrong product; a product label is unnecessarily long; English typography is corrupted; annotations cover product details; sage atmosphere is too faint; or the composition still feels too close to a clean separated studio flat lay.
- Reference image path: `examples/visual/06-korean-street-editorial.jpg`

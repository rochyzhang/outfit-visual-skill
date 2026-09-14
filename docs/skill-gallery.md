# Skill Gallery

These images are presentation-style references only. They are not product assets and must not be used for garment-role classification.

Users can refer to a Skill by number, English name, or short visual description.

Examples:

- "Use 02"
- "Use Invisible Editorial"
- "用 05 日杂目录感"

## 01 — Minimal Flat Lay

- Skill ID: `SK01_MINIMAL_FLAT_LAY`
- English name: Minimal Flat Lay
- Chinese description: 干净平铺穿搭图，适合整套搭配展示
- Canonical visual behavior: Clean top-down or near top-down full outfit flat lay in a warm-white studio. The uploaded outfit is the primary subject.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Forbidden elements: human model, portrait photography, lifestyle street photography, invented products, substituted products, missing required products.
- Usage example: "Use 01"

![01 — Minimal Flat Lay](../public/skill-examples/01-minimal-flat-lay.jpg)

## 02 — Invisible Editorial

- Skill ID: `SK02_INVISIBLE_EDITORIAL`
- English name: Invisible Editorial
- Chinese description: 隐形人物感穿搭编辑图，有动态、杂志感
- Canonical visual behavior: Dynamic invisible-body outfit editorial. Clothing may imply human motion, but no person is visible.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Forbidden elements: visible face, visible skin, identifiable human model, mannequin, ordinary model photography, invented products, missing required products.
- Usage example: "Use Invisible Editorial"

![02 — Invisible Editorial](../public/skill-examples/02-invisible-editorial.jpg)

## 03 — Look Breakdown

- Skill ID: `SK03_LOOK_BREAKDOWN`
- English name: Look Breakdown
- Chinese description: 整套 Look + 单品拆解说明
- Canonical visual behavior: Editorial layout with one primary styled look plus separate product/component breakdown and English-only labels.
- Required inputs: at least 3 valid user-provided product/outfit references.
- Forbidden elements: copied products from the reference image, invented products, non-English labels, cluttered poster layout, wrong output type.
- Usage example: "Use 03"

![03 — Look Breakdown](../public/skill-examples/03-look-breakdown.jpg)

## 04 — Prop Styling

- Skill ID: `SK04_PROP_STYLING`
- English name: Prop Styling
- Chinese description: 衣服与椅子、家具或小物一起陈列
- Canonical visual behavior: Product-first still life with clothing styled around a chair, furniture piece, or small supporting object in a concrete editorial setting.
- Required inputs: `bottom` and at least one of `top` or `outer`.
- Forbidden elements: prop as main subject, invented fashion products, copied reference-image products, impossible fabric contact, missing required products.
- Usage example: "Use Prop Styling"

![04 — Prop Styling](../public/skill-examples/04-prop-styling.jpg)

## 05 — Japanese Catalog

- Skill ID: `SK05_JAPANESE_CATALOG`
- English name: Japanese Catalog
- Chinese description: 日杂 / 日系目录感穿搭视觉
- Canonical visual behavior: Warm off-white catalog flat lay with precise English-only catalog typography. This is not generic Japanese model photography.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Forbidden elements: Japanese text, generic model portrait, arbitrary Japanese typography, invented products, copied reference-image products, missing required products.
- Usage example: "用 05 日杂目录感"

![05 — Japanese Catalog](../public/skill-examples/05-japanese-catalog.png)

## 06 — Korean Street Editorial

- Skill ID: `SK06_KOREAN_STREET_EDITORIAL`
- English name: Korean Street Editorial
- Chinese description: 韩系 / 首尔街头编辑感穿搭图
- Canonical visual behavior: Dusty-sage flat 2D human-silhouette Korean editorial with believable full-outfit proportions and mandatory short English per-product callouts. The garments form one complete head-to-toe Look, but remain visually flat and graphic rather than SK02's volumetric invisible body.
- Required inputs: `bottom`, `shoes`, and at least one of `top` or `outer`.
- Forbidden elements: visible person, mannequin, Korean text, Hangul, strong 3D SK02-like invisible walking body, independent product breakdown, generic catalog grid, invented products, copied reference-image products, missing required products.
- Usage example: "用 06 韩系街头编辑感"

![06 — Korean Street Editorial](../public/skill-examples/06-korean-street-editorial.jpg)

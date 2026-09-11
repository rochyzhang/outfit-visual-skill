# Outfit Visual Studio Agent Rules

## Project

Outfit Visual Studio is a standalone AI visual workflow application for:

- menswear
- gender-neutral styling
- couple styling
- social media fashion image production

Do not reference, inspect, import, migrate, or reuse any Brand Studio project, code, database, prompt library, component, configuration, or asset.

## Core Product Flow

Outfit -> Scene -> Composition -> Look / Light -> Generate

## Architecture Principles

- Keep modules separated by domain.
- UI components must not contain large AI prompts.
- Presets belong in configuration/data modules.
- AI integrations belong server-side.
- Product fidelity is a first-class domain concept.
- Business workflow state must remain independent from future canvas/node positioning state.
- Avoid premature abstraction.
- Avoid unnecessary dependencies.
- V1 prioritizes the generation workflow over infinite-canvas complexity.

## Coding Rules

- TypeScript strict mode.
- Do not introduce explicit `any` unless technically unavoidable and documented.
- Prefer small focused components.
- Do not silently disable lint rules.
- Do not weaken TypeScript settings to make code compile.
- Do not modify tests merely to hide regressions.
- Do not implement future Tasks unless explicitly requested.
- Keep server-only secrets server-side.
- Never commit API keys.
- Run available verification commands before reporting completion.

## AI Rules

Future AI architecture will be separated into:

1. Prompt Compiler
2. Image Generation

Core priority:

Product Fidelity > Composition > Scene > Style

Do not implement this AI system in Task 01.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

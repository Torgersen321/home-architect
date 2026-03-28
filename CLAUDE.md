@AGENTS.md

# Home Architect

AI-powered cabin planner. Upload blueprint/sketch → 3D model → construction roadmap.

## Commands

- `bun dev` — start dev server on localhost:3000
- `bun run build` — production build
- `bun run test` — run Vitest tests
- `bun run test:watch` — run tests in watch mode

## Testing

Framework: Vitest + React Testing Library + happy-dom
Test command: `bun run test`
Tests are in `src/__tests__/`

## Architecture

- Next.js 16 app router with TypeScript and Tailwind
- Claude API (Sonnet) for vision analysis and model generation
- React Three Fiber for 3D rendering (WebGL, not WebGPU)
- Zustand for state management
- IndexedDB (via idb-keyval) for local persistence
- Zod v4 for geometry schema validation

## Key files

- `src/lib/geometry-schema.ts` — typed IR schema between Claude and 3D renderer
- `src/lib/prompts.ts` — modular system prompts (analyzeImage, generateModel, refineModel, generateRoadmap)
- `src/lib/chat-engine.ts` — AI pipeline orchestration
- `src/lib/store.ts` — Zustand store with IndexedDB persistence
- `src/components/Workspace.tsx` — main orchestrator
- `src/components/EditorViewport.tsx` — Three.js 3D renderer
- `src/app/api/chat/route.ts` — Claude API proxy

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local`

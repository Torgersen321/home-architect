# Home Architect

AI-powered cabin planner. Upload a blueprint or sketch, get a 3D model and construction roadmap.

## Quick Start

```bash
cp .env.local.example .env.local
# Add your Anthropic API key to .env.local

bun install
bun dev
```

Open http://localhost:3000

## How It Works

1. **Upload** a blueprint, sketch, or photo of your cabin plan
2. **AI analyzes** the image and asks for one anchor measurement
3. **3D model** generates in the browser from extracted dimensions
4. **Refine** by describing changes in chat ("make the roof steeper")
5. **Roadmap** auto-generates with construction phases, materials, and tips

## Tech Stack

- Next.js 16 + TypeScript
- React Three Fiber (3D rendering)
- Claude API (vision + conversation)
- IndexedDB (local project persistence)
- Zod (geometry schema validation)
- Tailwind CSS

## Architecture

```
src/
  app/
    page.tsx ............. Main page (dynamic import, no SSR)
    api/chat/route.ts .... Claude API proxy
  components/
    Workspace.tsx ........ Orchestrator (manages conversation flow)
    EditorViewport.tsx ... 3D renderer (React Three Fiber)
    ChatPanel.tsx ........ AI chat sidebar
    FileUpload.tsx ....... Drag-drop image upload
    BuildRoadmap.tsx ..... Construction phase cards
    PhaseBar.tsx ......... 4-phase progress indicator
  lib/
    geometry-schema.ts ... Zod schema for building geometry IR
    prompts.ts ........... Modular system prompts for each AI task
    store.ts ............. Zustand store + IndexedDB persistence
    chat-engine.ts ....... AI pipeline (analyze, generate, refine, roadmap)
    image-utils.ts ....... Client-side image resize + validation
```

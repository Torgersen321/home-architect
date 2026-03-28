# Changelog

All notable changes to Home Architect will be documented in this file.

## [0.1.0.0] - 2026-03-28

### Added
- Upload blueprints, sketches, or photos via drag-and-drop (JPG/PNG/WebP, max 20MB)
- Client-side image resize to 1568px before sending to Claude API
- AI image analysis via Claude Sonnet vision to extract building features
- Anchor dimension workflow: AI asks for one real-world measurement to calibrate all dimensions
- GeometryIR schema (Zod v4) for typed intermediate representation between AI and 3D renderer
- Physics validation for impossible geometry (openings beyond walls, etc.)
- 3D model generation from AI-extracted dimensions using React Three Fiber
- Walls, doors, windows, and gable/flat roof rendering with orbit controls
- Model refinement via chat: describe changes in plain language, AI updates the model
- Construction roadmap generation: phased build plan with durations, materials, and tips
- Chat panel with phase-aware placeholders and auto-scroll
- 4-phase progress bar (Vision, Plan, Materials, Build)
- Scrollable roadmap cards with tips and materials per stage
- Zustand store with IndexedDB persistence via idb-keyval
- Claude API proxy route with vision support and error handling
- Modular prompt system (analyzeImage, generateModel, refineModel, generateRoadmap)
- Vitest test suite: 41 tests covering schema validation, physics checks, chat engine, and API route

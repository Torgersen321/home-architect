# TODOS

## Investigate: Guided wall tracing as fallback to AI dimension extraction

**What:** If the Claude vision spike shows poor accuracy for extracting dimensions from blueprints/sketches, investigate a guided tracing approach: user clicks wall corners on an uploaded blueprint, provides one known measurement, and the model generates deterministically.

**Why:** Codex (outside voice in eng review) flagged that AI-powered dimension extraction from images is unreliable without scale reference. Guided tracing removes the AI spatial reasoning dependency entirely, producing exact geometry from user input.

**Pros:** Much higher dimensional accuracy, no dependency on Claude vision spatial reasoning, simpler and more deterministic pipeline, works reliably for blueprints with scale.

**Cons:** More manual user interaction (clicking corners vs. "upload and done"). May not work well for rough hand sketches. Requires a 2D overlay UI on top of the uploaded image.

**Context:** This is a potential alternative or fallback for the core image-to-geometry pipeline. The current plan uses Claude vision to extract dimensions, with an anchor dimension question for calibration. If the vision spike shows <80% accuracy on real blueprints, this tracing approach becomes the primary path. The two approaches could coexist: AI extraction for rough sketches, guided tracing for precise blueprints.

**Depends on:** Claude vision spike results (accuracy on dad's actual blueprint/sketch).

**Added:** 2026-03-28 by /plan-eng-review (outside voice suggestion from Codex)

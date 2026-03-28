"use client";

import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/lib/store";
import { analyzeImage, generateModel, refineModel, generateRoadmap } from "@/lib/chat-engine";
import { FileUpload } from "./FileUpload";
import { ChatPanel } from "./ChatPanel";
import { EditorViewport } from "./EditorViewport";
import { BuildRoadmap } from "./BuildRoadmap";
import { PhaseBar } from "./PhaseBar";

/**
 * Main workspace orchestrator.
 *
 * Manages the conversation flow:
 *   1. User uploads image → analyzeImage prompt
 *   2. AI asks for anchor dimension → user provides
 *   3. generateModel prompt → 3D model appears
 *   4. User can refine via chat → refineModel prompt
 *   5. Auto-generate roadmap once model is ready
 */
export function Workspace() {
  const store = useProjectStore();
  const conversationPhase = useProjectStore((s) => s.conversationPhase);
  const geometryIR = useProjectStore((s) => s.geometryIR);

  // Load saved state on mount
  useEffect(() => {
    store.loadFromStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle image upload
  const handleImageUploaded = useCallback(
    async (dataUrl: string) => {
      const s = useProjectStore.getState();
      s.addUploadedImage(dataUrl);
      s.addMessage({ role: "user", content: "Here is my building plan.", imageUrl: dataUrl });
      s.setConversationPhase("analyzing");
      s.setIsAiThinking(true);

      try {
        const analysis = await analyzeImage(dataUrl);
        s.setImageAnalysis(analysis);
        s.addMessage({ role: "assistant", content: analysis });
        s.setConversationPhase("awaiting_anchor");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to analyze image";
        s.addMessage({ role: "assistant", content: `Sorry, I had trouble analyzing that image. ${msg}. Please try uploading again.` });
        s.setConversationPhase("idle");
      } finally {
        s.setIsAiThinking(false);
      }
    },
    []
  );

  // Handle user messages based on conversation phase
  useEffect(() => {
    const handler = async (e: Event) => {
      const text = (e as CustomEvent).detail.text;
      const s = useProjectStore.getState();
      const phase = s.conversationPhase;

      if (phase === "awaiting_anchor") {
        // Parse anchor dimension from user input
        const numberMatch = text.match(/[\d.]+/);
        if (!numberMatch) {
          s.addMessage({
            role: "assistant",
            content: "I need a number for the measurement. For example: '8 meters' or '6.5'. What is the width of the front wall in meters?",
          });
          return;
        }

        const value = parseFloat(numberMatch[0]);
        if (value <= 0 || value > 100) {
          s.addMessage({
            role: "assistant",
            content: "That measurement seems off. Please provide a dimension in meters (e.g., 8 for 8 meters).",
          });
          return;
        }

        s.setAnchorDimension({ description: text, value });
        s.setConversationPhase("generating");
        s.setIsAiThinking(true);
        s.addMessage({ role: "assistant", content: `Got it: ${value}m. Generating your 3D model now...` });

        try {
          const imageAnalysis = s.imageAnalysis || "";
          const images = s.uploadedImages;
          const latestImage = images[images.length - 1];

          const model = await generateModel(
            imageAnalysis,
            text,
            value,
            "blueprint", // default to blueprint-first
            latestImage
          );

          s.setGeometryIR(model);
          s.setConversationPhase("model_ready");
          s.addMessage({
            role: "assistant",
            content: `Here is your 3D model! Confidence: ${Math.round(model.metadata.confidenceScore * 100)}%.\n\nTake a look and tell me if anything needs adjusting. For example:\n- "Make the front wall longer"\n- "Add a window on the left side"\n- "The roof should be steeper"\n\nOr say "looks good" to generate the construction roadmap.`,
          });

          s.saveToStorage();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to generate model";
          s.addMessage({ role: "assistant", content: `Sorry, I had trouble generating the model. ${msg}. Let me try again... could you confirm the key dimensions?` });
          s.setConversationPhase("awaiting_anchor");
        } finally {
          s.setIsAiThinking(false);
        }
      } else if (phase === "model_ready") {
        const lower = text.toLowerCase();

        // Check if user approves the model
        if (
          lower.includes("looks good") ||
          lower.includes("perfect") ||
          lower.includes("ok") ||
          lower.includes("generate roadmap") ||
          lower.includes("build plan")
        ) {
          s.setIsAiThinking(true);
          s.addMessage({ role: "assistant", content: "Generating your construction roadmap..." });

          try {
            const model = s.geometryIR!;
            const roadmap = await generateRoadmap(model);
            s.setRoadmapPhases(roadmap);
            s.setConversationPhase("roadmap_ready");
            s.addMessage({
              role: "assistant",
              content: `Your construction roadmap is ready! ${roadmap.length} stages from foundation to finishing.\n\nScroll down to see the full plan. Each stage includes estimated duration, materials needed, and tips.\n\nAsk me anything about the build plan!`,
            });
            s.saveToStorage();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to generate roadmap";
            s.addMessage({ role: "assistant", content: `Sorry, I had trouble creating the roadmap. ${msg}. Let me try again.` });
          } finally {
            s.setIsAiThinking(false);
          }
          return;
        }

        // Otherwise, refine the model
        s.setConversationPhase("refining");
        s.setIsAiThinking(true);

        try {
          const result = await refineModel(s.geometryIR!, text);

          if (result.type === "question") {
            s.addMessage({ role: "assistant", content: result.text });
            s.setConversationPhase("model_ready");
          } else {
            s.setGeometryIR(result.data);
            s.setConversationPhase("model_ready");
            s.addMessage({
              role: "assistant",
              content: "Model updated! Take another look. Tell me if you want more changes, or say \"looks good\" to generate the construction roadmap.",
            });
            s.saveToStorage();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to refine model";
          s.addMessage({ role: "assistant", content: `Sorry, I had trouble with that change. ${msg}. Could you describe what you want differently?` });
          s.setConversationPhase("model_ready");
        } finally {
          s.setIsAiThinking(false);
        }
      }
    };

    window.addEventListener("user-message", handler);
    return () => window.removeEventListener("user-message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Home Architect</h1>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{store.projectName}</span>
          {geometryIR && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              Model ready
            </span>
          )}
        </div>
      </div>

      {/* Phase progress */}
      <PhaseBar />

      {/* Main layout: viewport + chat */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6" style={{ minHeight: 500 }}>
        {/* 3D Viewport */}
        <div className="flex flex-col gap-4">
          <EditorViewport />
          {conversationPhase === "idle" && (
            <FileUpload onImageUploaded={handleImageUploaded} />
          )}
          {conversationPhase !== "idle" && store.uploadedImages.length > 0 && (
            <div className="flex gap-2">
              {store.uploadedImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Upload ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-200"
                />
              ))}
              <FileUpload
                onImageUploaded={handleImageUploaded}
                disabled={store.isAiThinking}
              />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <ChatPanel />
      </div>

      {/* Build roadmap */}
      <BuildRoadmap />
    </div>
  );
}

"use client";

import { useProjectStore, type ConversationPhase } from "@/lib/store";

const PHASES = [
  { key: "vision", label: "Vision", num: 1 },
  { key: "plan", label: "Plan", num: 2 },
  { key: "materials", label: "Materials", num: 3 },
  { key: "build", label: "Build", num: 4 },
] as const;

function getActivePhase(conversationPhase: ConversationPhase): number {
  switch (conversationPhase) {
    case "idle":
    case "analyzing":
    case "awaiting_anchor":
    case "generating":
    case "model_ready":
    case "refining":
      return 1;
    case "roadmap_ready":
      return 2;
    default:
      return 1;
  }
}

export function PhaseBar() {
  const conversationPhase = useProjectStore((s) => s.conversationPhase);
  const activePhase = getActivePhase(conversationPhase);

  return (
    <div className="flex bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {PHASES.map((phase, index) => (
        <div
          key={phase.key}
          className={`flex-1 py-3 px-4 text-center transition-colors ${
            index < PHASES.length - 1 ? "border-r border-zinc-200" : ""
          } ${
            phase.num === activePhase
              ? "bg-zinc-900 text-white"
              : phase.num < activePhase
                ? "bg-zinc-100 text-zinc-500"
                : "text-zinc-400"
          }`}
        >
          <div className="text-base font-bold">{phase.num}</div>
          <div className="text-[10px] uppercase tracking-wider">{phase.label}</div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useProjectStore } from "@/lib/store";

export function BuildRoadmap() {
  const roadmapPhases = useProjectStore((s) => s.roadmapPhases);

  if (roadmapPhases.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-800 mb-3">Build Roadmap</h3>
        <p className="text-xs text-zinc-400">
          A construction roadmap will appear here once the 3D model is generated.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-800 mb-4">Build Roadmap</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {roadmapPhases.map((phase, index) => (
          <div
            key={phase.phase}
            className={`min-w-[200px] flex-shrink-0 p-4 border rounded-xl ${
              index === 0 ? "border-zinc-900 border-2" : "border-zinc-200"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              Stage {phase.phase}
            </div>
            <div className="text-sm font-semibold text-zinc-800 mb-1">
              {phase.name}
            </div>
            <div className="text-xs text-zinc-500 leading-relaxed mb-2">
              {phase.description}
            </div>
            <div className="text-[10px] text-zinc-400 mb-2">
              Est: {phase.estimatedDuration}
            </div>
            {phase.tips.length > 0 && (
              <div className="border-t border-zinc-100 pt-2 mt-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Tips</div>
                {phase.tips.map((tip, i) => (
                  <div key={i} className="text-[11px] text-zinc-600 leading-relaxed">
                    • {tip}
                  </div>
                ))}
              </div>
            )}
            {phase.materials.length > 0 && (
              <div className="border-t border-zinc-100 pt-2 mt-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Materials</div>
                <div className="text-[11px] text-zinc-600">
                  {phase.materials.join(", ")}
                </div>
              </div>
            )}
            <div className="mt-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  index === 0
                    ? "bg-amber-50 text-amber-700"
                    : "bg-zinc-50 text-zinc-400"
                }`}
              >
                {index === 0 ? "Start here" : "Upcoming"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

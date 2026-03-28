"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Three.js / Canvas
const Workspace = dynamic(
  () => import("@/components/Workspace").then((m) => m.Workspace),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <Workspace />
    </main>
  );
}

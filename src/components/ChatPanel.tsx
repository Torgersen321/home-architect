"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/lib/store";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useProjectStore((s) => s.messages);
  const isAiThinking = useProjectStore((s) => s.isAiThinking);
  const conversationPhase = useProjectStore((s) => s.conversationPhase);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isAiThinking) return;

    useProjectStore.getState().addMessage({
      role: "user",
      content: text,
    });

    setInput("");

    // Dispatch to the appropriate handler via custom event
    window.dispatchEvent(
      new CustomEvent("user-message", { detail: { text } })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    switch (conversationPhase) {
      case "idle":
        return "Upload an image to get started...";
      case "analyzing":
        return "Analyzing your image...";
      case "awaiting_anchor":
        return "Enter the measurement (e.g., '8 meters')...";
      case "generating":
        return "Generating 3D model...";
      case "model_ready":
        return "Describe changes (e.g., 'make it wider')...";
      case "refining":
        return "Refining model...";
      case "roadmap_ready":
        return "Ask about the build plan...";
      default:
        return "Type a message...";
    }
  };

  const isInputDisabled =
    isAiThinking || conversationPhase === "idle" || conversationPhase === "analyzing" || conversationPhase === "generating" || conversationPhase === "refining";

  return (
    <div className="flex flex-col h-full bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
        <div className={`w-2 h-2 rounded-full ${isAiThinking ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`} />
        <span className="text-sm font-semibold text-zinc-800">Architect Agent</span>
        <span className="text-xs text-zinc-400 ml-auto">
          {conversationPhase === "idle" ? "Waiting for image" : conversationPhase.replace(/_/g, " ")}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-zinc-400 mt-8">
            <p>Upload a blueprint or sketch to start.</p>
            <p className="mt-1 text-xs">I will analyze it and create a 3D model for you.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-zinc-900 text-white rounded-br-sm"
                  : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded"
                  className="max-w-full max-h-48 rounded-lg mb-2"
                />
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isAiThinking && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 text-zinc-500 px-3.5 py-2.5 rounded-xl rounded-bl-sm text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-zinc-100">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={isInputDisabled}
          className="flex-1 px-3.5 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 disabled:opacity-50 disabled:bg-zinc-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isInputDisabled}
          className="px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

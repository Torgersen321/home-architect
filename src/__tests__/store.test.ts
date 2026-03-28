import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/lib/store";

describe("useProjectStore", () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it("starts with initial state", () => {
    const state = useProjectStore.getState();
    expect(state.projectName).toBe("My Cabin");
    expect(state.messages).toHaveLength(0);
    expect(state.conversationPhase).toBe("idle");
    expect(state.geometryIR).toBeNull();
    expect(state.roadmapPhases).toHaveLength(0);
  });

  it("adds messages with auto-generated id and timestamp", () => {
    const store = useProjectStore.getState();
    store.addMessage({ role: "user", content: "Hello" });

    const state = useProjectStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("user");
    expect(state.messages[0].content).toBe("Hello");
    expect(state.messages[0].id).toBeTruthy();
    expect(state.messages[0].timestamp).toBeGreaterThan(0);
  });

  it("transitions conversation phases", () => {
    const store = useProjectStore.getState();
    store.setConversationPhase("analyzing");
    expect(useProjectStore.getState().conversationPhase).toBe("analyzing");

    store.setConversationPhase("model_ready");
    expect(useProjectStore.getState().conversationPhase).toBe("model_ready");
  });

  it("stores uploaded images", () => {
    const store = useProjectStore.getState();
    store.addUploadedImage("data:image/png;base64,abc123");
    store.addUploadedImage("data:image/jpeg;base64,def456");

    const state = useProjectStore.getState();
    expect(state.uploadedImages).toHaveLength(2);
  });

  it("resets project to initial state", () => {
    const store = useProjectStore.getState();
    store.addMessage({ role: "user", content: "test" });
    store.setConversationPhase("model_ready");
    store.setProjectName("Custom Name");

    store.resetProject();

    const state = useProjectStore.getState();
    expect(state.messages).toHaveLength(0);
    expect(state.conversationPhase).toBe("idle");
    expect(state.projectName).toBe("My Cabin");
  });

  it("sets geometry IR", () => {
    const store = useProjectStore.getState();
    const mockIR = { version: "1.0" as const, metadata: {} } as any;
    store.setGeometryIR(mockIR);
    expect(useProjectStore.getState().geometryIR).toBe(mockIR);
  });
});

import { create } from "zustand";
// Lazy import to avoid indexedDB reference errors in test environments
const idbKeyval = () => import("idb-keyval");
import type { GeometryIR } from "./geometry-schema";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string; // base64 data URL for uploaded images
  timestamp: number;
}

export interface RoadmapPhase {
  phase: number;
  name: string;
  description: string;
  estimatedDuration: string;
  dependencies: number[];
  materials: string[];
  tips: string[];
}

export type ConversationPhase =
  | "idle"           // no image uploaded yet
  | "analyzing"      // AI is analyzing the uploaded image
  | "awaiting_anchor"// AI needs an anchor dimension
  | "generating"     // AI is generating the 3D model
  | "model_ready"    // model is displayed, user can refine
  | "refining"       // AI is refining the model
  | "roadmap_ready"; // roadmap has been generated

interface ProjectState {
  // Project metadata
  projectName: string;

  // Conversation
  messages: ChatMessage[];
  conversationPhase: ConversationPhase;
  isAiThinking: boolean;

  // Uploaded images (base64 data URLs)
  uploadedImages: string[];

  // Geometry model
  geometryIR: GeometryIR | null;

  // Roadmap
  roadmapPhases: RoadmapPhase[];

  // Image analysis context (passed between prompts)
  imageAnalysis: string | null;
  anchorDimension: { description: string; value: number } | null;

  // Actions
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setConversationPhase: (phase: ConversationPhase) => void;
  setIsAiThinking: (thinking: boolean) => void;
  addUploadedImage: (dataUrl: string) => void;
  setGeometryIR: (ir: GeometryIR | null) => void;
  setRoadmapPhases: (phases: RoadmapPhase[]) => void;
  setImageAnalysis: (analysis: string | null) => void;
  setAnchorDimension: (anchor: { description: string; value: number } | null) => void;
  setProjectName: (name: string) => void;
  resetProject: () => void;

  // Persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = "home-architect-project";

const initialState = {
  projectName: "My Cabin",
  messages: [],
  conversationPhase: "idle" as ConversationPhase,
  isAiThinking: false,
  uploadedImages: [],
  geometryIR: null,
  roadmapPhases: [],
  imageAnalysis: null,
  anchorDimension: null,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  addMessage: (msg) => {
    const message: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    // Auto-save after each message
    setTimeout(() => get().saveToStorage(), 100);
  },

  setConversationPhase: (phase) => set({ conversationPhase: phase }),
  setIsAiThinking: (thinking) => set({ isAiThinking: thinking }),
  addUploadedImage: (dataUrl) =>
    set((state) => ({ uploadedImages: [...state.uploadedImages, dataUrl] })),
  setGeometryIR: (ir) => set({ geometryIR: ir }),
  setRoadmapPhases: (phases) => set({ roadmapPhases: phases }),
  setImageAnalysis: (analysis) => set({ imageAnalysis: analysis }),
  setAnchorDimension: (anchor) => set({ anchorDimension: anchor }),
  setProjectName: (name) => set({ projectName: name }),

  resetProject: () => {
    set(initialState);
    idbKeyval().then(({ del }) => del(STORAGE_KEY)).catch(() => {});
  },

  saveToStorage: async () => {
    const state = get();
    const persistable = {
      projectName: state.projectName,
      messages: state.messages,
      conversationPhase: state.conversationPhase,
      uploadedImages: state.uploadedImages,
      geometryIR: state.geometryIR,
      roadmapPhases: state.roadmapPhases,
      imageAnalysis: state.imageAnalysis,
      anchorDimension: state.anchorDimension,
    };
    const { set: idbSet } = await idbKeyval();
    await idbSet(STORAGE_KEY, persistable);
  },

  loadFromStorage: async () => {
    try {
      const { get: idbGet } = await idbKeyval();
      const stored = await idbGet(STORAGE_KEY);
      if (stored && typeof stored === "object") {
        set({
          projectName: stored.projectName || initialState.projectName,
          messages: stored.messages || [],
          conversationPhase: stored.conversationPhase || "idle",
          uploadedImages: stored.uploadedImages || [],
          geometryIR: stored.geometryIR || null,
          roadmapPhases: stored.roadmapPhases || [],
          imageAnalysis: stored.imageAnalysis || null,
          anchorDimension: stored.anchorDimension || null,
          isAiThinking: false,
        });
      }
    } catch {
      // Corrupted storage, start fresh
      console.warn("Failed to load project from storage, starting fresh");
    }
  },
}));

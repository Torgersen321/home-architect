import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateModel, refineModel, generateRoadmap } from "@/lib/chat-engine";
import type { GeometryIR } from "@/lib/geometry-schema";

const validModelJson: GeometryIR = {
  version: "1.0",
  metadata: {
    name: "Test Cabin",
    anchorDimension: { description: "front wall", value: 8 },
    confidenceScore: 0.8,
    sourceType: "blueprint",
  },
  levels: [
    {
      id: "level-1",
      name: "Ground Floor",
      floorHeight: 0,
      ceilingHeight: 2.4,
      walls: [
        { id: "wall-1", start: { x: 0, y: 0, z: 0 }, end: { x: 8, y: 0, z: 0 }, height: 2.4, thickness: 0.148, isLoadBearing: true },
        { id: "wall-2", start: { x: 8, y: 0, z: 0 }, end: { x: 8, y: 0, z: 6 }, height: 2.4, thickness: 0.148, isLoadBearing: true },
        { id: "wall-3", start: { x: 8, y: 0, z: 6 }, end: { x: 0, y: 0, z: 6 }, height: 2.4, thickness: 0.148, isLoadBearing: true },
        { id: "wall-4", start: { x: 0, y: 0, z: 6 }, end: { x: 0, y: 0, z: 0 }, height: 2.4, thickness: 0.148, isLoadBearing: true },
      ],
      openings: [],
    },
  ],
  roof: { type: "gable", pitch: 30, overhang: 0.3, ridgeDirection: "x" },
  foundation: { type: "slab", depth: 1.2 },
};

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("generateModel", () => {
  it("returns validated GeometryIR on valid API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(validModelJson) }),
    });

    const result = await generateModel("A simple cabin", "front wall width", 8, "blueprint");
    expect(result.version).toBe("1.0");
    expect(result.metadata.name).toBe("Test Cabin");
    expect(result.levels).toHaveLength(1);
  });

  it("extracts JSON wrapped in markdown code block", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: `Here is the model:\n\`\`\`json\n${JSON.stringify(validModelJson)}\n\`\`\`` }),
    });

    const result = await generateModel("A cabin sketch", "width", 6, "sketch");
    expect(result.version).toBe("1.0");
  });

  it("throws on non-JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "I cannot generate a model from this image." }),
    });

    await expect(generateModel("bad", "w", 5, "photo")).rejects.toThrow("AI did not return valid JSON");
  });

  it("throws on malformed JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: '{"version": "1.0", broken' }),
    });

    await expect(generateModel("bad", "w", 5, "blueprint")).rejects.toThrow("AI did not return valid JSON");
  });

  it("throws on schema validation failure", async () => {
    const invalidModel = { ...validModelJson, version: "2.0" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(invalidModel) }),
    });

    await expect(generateModel("desc", "w", 5, "blueprint")).rejects.toThrow("Invalid geometry");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    await expect(generateModel("desc", "w", 5, "blueprint")).rejects.toThrow("Server error");
  });

  it("includes image when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(validModelJson) }),
    });

    await generateModel("desc", "w", 8, "blueprint", "data:image/png;base64,abc123");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].imageBase64).toBe("abc123");
    expect(body.messages[0].imageMediaType).toBe("image/png");
  });
});

describe("refineModel", () => {
  it("returns updated model when AI responds with JSON", async () => {
    const updated = { ...validModelJson, metadata: { ...validModelJson.metadata, name: "Updated Cabin" } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(updated) }),
    });

    const result = await refineModel(validModelJson, "make it wider");
    expect(result.type).toBe("model");
    if (result.type === "model") {
      expect(result.data.metadata.name).toBe("Updated Cabin");
    }
  });

  it("returns question when AI responds with text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "How much wider? 2 meters or 4?" }),
    });

    const result = await refineModel(validModelJson, "make it bigger");
    expect(result.type).toBe("question");
    if (result.type === "question") {
      expect(result.text).toContain("How much wider");
    }
  });

  it("returns question on invalid model JSON", async () => {
    const badModel = { version: "bad" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(badModel) }),
    });

    const result = await refineModel(validModelJson, "change roof");
    expect(result.type).toBe("question");
  });
});

describe("generateRoadmap", () => {
  it("returns parsed roadmap phases", async () => {
    const mockRoadmap = [
      { phase: 1, name: "Foundation", description: "Prep the site", estimatedDuration: "3 days", dependencies: [], materials: ["concrete"], tips: ["Check drainage"] },
      { phase: 2, name: "Framing", description: "Build walls", estimatedDuration: "1 week", dependencies: [1], materials: ["lumber"], tips: ["Use level"] },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: JSON.stringify(mockRoadmap) }),
    });

    const result = await generateRoadmap(validModelJson);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Foundation");
    expect(result[1].dependencies).toEqual([1]);
  });

  it("throws on non-array response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "I can't generate a roadmap." }),
    });

    await expect(generateRoadmap(validModelJson)).rejects.toThrow("valid roadmap");
  });
});

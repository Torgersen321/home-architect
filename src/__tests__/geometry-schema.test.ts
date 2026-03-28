import { describe, it, expect } from "vitest";
import { validateGeometry, validatePhysics, type GeometryIR } from "@/lib/geometry-schema";

const validCabin: GeometryIR = {
  version: "1.0",
  metadata: {
    name: "Test Cabin",
    anchorDimension: { description: "front wall width", value: 8 },
    confidenceScore: 0.85,
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
      openings: [
        { id: "door-1", type: "door", wallId: "wall-1", position: 3, width: 0.9, height: 2.1, sillHeight: 0 },
        { id: "window-1", type: "window", wallId: "wall-2", position: 1.5, width: 1.2, height: 1.2, sillHeight: 0.9 },
      ],
    },
  ],
  roof: { type: "gable", pitch: 30, overhang: 0.3, ridgeDirection: "x" },
  foundation: { type: "slab", depth: 1.2 },
};

describe("validateGeometry", () => {
  it("accepts a valid cabin geometry", () => {
    const result = validateGeometry(validCabin);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.name).toBe("Test Cabin");
      expect(result.data.levels).toHaveLength(1);
      expect(result.data.levels[0].walls).toHaveLength(4);
    }
  });

  it("rejects missing version", () => {
    const { version, ...noVersion } = validCabin;
    const result = validateGeometry(noVersion);
    expect(result.success).toBe(false);
  });

  it("rejects invalid roof type", () => {
    const bad = { ...validCabin, roof: { ...validCabin.roof, type: "pyramid" } };
    const result = validateGeometry(bad);
    expect(result.success).toBe(false);
  });

  it("rejects negative wall height", () => {
    const bad = structuredClone(validCabin);
    bad.levels[0].walls[0].height = -1;
    const result = validateGeometry(bad);
    expect(result.success).toBe(false);
  });

  it("rejects empty levels array", () => {
    const bad = { ...validCabin, levels: [] };
    const result = validateGeometry(bad);
    expect(result.success).toBe(false);
  });

  it("rejects roof pitch > 90", () => {
    const bad = { ...validCabin, roof: { ...validCabin.roof, pitch: 100 } };
    const result = validateGeometry(bad);
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateGeometry("string").success).toBe(false);
    expect(validateGeometry(null).success).toBe(false);
    expect(validateGeometry(42).success).toBe(false);
  });
});

describe("validatePhysics", () => {
  it("returns no warnings for valid cabin", () => {
    const warnings = validatePhysics(validCabin);
    expect(warnings).toHaveLength(0);
  });

  it("warns when opening extends beyond wall", () => {
    const bad = structuredClone(validCabin);
    bad.levels[0].openings[0].position = 7.5; // door at 7.5m on 8m wall, 0.9m wide = extends to 8.4m
    const warnings = validatePhysics(bad);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("extends beyond wall");
  });

  it("warns when opening extends above wall", () => {
    const bad = structuredClone(validCabin);
    bad.levels[0].openings[1].sillHeight = 2.0; // window at 2.0m + 1.2m height = 3.2m, wall is 2.4m
    const warnings = validatePhysics(bad);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("extends above wall");
  });

  it("warns when opening references non-existent wall", () => {
    const bad = structuredClone(validCabin);
    bad.levels[0].openings[0].wallId = "wall-99";
    const warnings = validatePhysics(bad);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("non-existent wall");
  });
});

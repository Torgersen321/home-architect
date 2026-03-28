import { z } from "zod/v4";

/**
 * Geometry Intermediate Representation (IR)
 *
 * This typed schema sits between Claude's output and the 3D renderer.
 * Claude vision extracts dimensions from blueprints/sketches and outputs
 * structured JSON matching this schema. The renderer consumes validated IR.
 *
 * FLOW:
 *   Blueprint image → Claude Vision → Raw JSON → Zod validation → GeometryIR → 3D Renderer
 */

export const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const WallSchema = z.object({
  id: z.string(),
  start: Vec3Schema.describe("Start point of wall in meters"),
  end: Vec3Schema.describe("End point of wall in meters"),
  height: z.number().positive().describe("Wall height in meters"),
  thickness: z.number().positive().default(0.148).describe("Wall thickness in meters (default: 148mm Norwegian standard)"),
  isLoadBearing: z.boolean().default(false),
});

export const OpeningSchema = z.object({
  id: z.string(),
  type: z.enum(["door", "window"]),
  wallId: z.string().describe("ID of the wall this opening belongs to"),
  position: z.number().min(0).describe("Distance from wall start in meters"),
  width: z.number().positive().describe("Opening width in meters"),
  height: z.number().positive().describe("Opening height in meters"),
  sillHeight: z.number().min(0).default(0).describe("Height from floor to bottom of opening in meters"),
});

export const RoofSchema = z.object({
  type: z.enum(["gable", "hip", "flat", "shed", "mansard"]),
  pitch: z.number().min(0).max(90).describe("Roof pitch in degrees"),
  overhang: z.number().min(0).default(0.3).describe("Roof overhang in meters"),
  ridgeDirection: z.enum(["x", "z"]).default("x").describe("Direction of the ridge line"),
});

export const LevelSchema = z.object({
  id: z.string(),
  name: z.string().describe("e.g., 'Ground Floor', 'Loft'"),
  floorHeight: z.number().min(0).describe("Height of this floor above ground in meters"),
  ceilingHeight: z.number().positive().describe("Floor-to-ceiling height in meters"),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
});

export const GeometryIRSchema = z.object({
  version: z.literal("1.0"),
  metadata: z.object({
    name: z.string().default("Untitled Cabin"),
    anchorDimension: z.object({
      description: z.string().describe("What was measured, e.g., 'front wall width'"),
      value: z.number().positive().describe("The known measurement in meters"),
    }).describe("The one real-world measurement used to calibrate all dimensions"),
    confidenceScore: z.number().min(0).max(1).describe("AI confidence in the extraction (0-1)"),
    sourceType: z.enum(["blueprint", "sketch", "photo"]),
  }),
  levels: z.array(LevelSchema).min(1),
  roof: RoofSchema,
  foundation: z.object({
    type: z.enum(["slab", "crawlspace", "basement", "piers"]),
    depth: z.number().positive().describe("Foundation depth in meters"),
  }),
});

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Roof = z.infer<typeof RoofSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type GeometryIR = z.infer<typeof GeometryIRSchema>;

/**
 * Validate Claude's raw JSON output against the geometry schema.
 * Returns the validated IR or a list of specific errors.
 */
export function validateGeometry(raw: unknown): { success: true; data: GeometryIR } | { success: false; errors: string[] } {
  const result = GeometryIRSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}

/**
 * Check for physically impossible geometry that Zod can't catch.
 * e.g., openings wider than their wall, overlapping walls, etc.
 */
export function validatePhysics(ir: GeometryIR): string[] {
  const warnings: string[] = [];

  for (const level of ir.levels) {
    for (const opening of level.openings) {
      const wall = level.walls.find((w) => w.id === opening.wallId);
      if (!wall) {
        warnings.push(`Opening ${opening.id} references non-existent wall ${opening.wallId}`);
        continue;
      }

      const wallLength = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2)
      );

      if (opening.position + opening.width > wallLength) {
        warnings.push(
          `Opening ${opening.id} extends beyond wall ${wall.id} (wall: ${wallLength.toFixed(1)}m, opening ends at: ${(opening.position + opening.width).toFixed(1)}m)`
        );
      }

      if (opening.sillHeight + opening.height > wall.height) {
        warnings.push(
          `Opening ${opening.id} extends above wall ${wall.id} (wall: ${wall.height.toFixed(1)}m, opening top: ${(opening.sillHeight + opening.height).toFixed(1)}m)`
        );
      }
    }
  }

  return warnings;
}

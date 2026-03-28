"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera } from "@react-three/drei";
import { useProjectStore } from "@/lib/store";
import type { GeometryIR, Wall, Opening, Roof } from "@/lib/geometry-schema";
import * as THREE from "three";

/**
 * 3D viewport that renders a GeometryIR model using React Three Fiber.
 *
 * This is a direct Three.js renderer (not pascalorg/editor) so the app
 * works regardless of the editor spike outcome. If the spike succeeds,
 * this component can be swapped for the pascal viewer.
 */

function WallMesh({ wall }: { wall: Wall }) {
  const length = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2)
  );
  const centerX = (wall.start.x + wall.end.x) / 2;
  const centerZ = (wall.start.z + wall.end.z) / 2;
  const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);

  return (
    <mesh
      position={[centerX, wall.height / 2, centerZ]}
      rotation={[0, -angle, 0]}
    >
      <boxGeometry args={[length, wall.height, wall.thickness]} />
      <meshStandardMaterial
        color={wall.isLoadBearing ? "#8B7355" : "#D4C5A9"}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function OpeningMesh({ opening, wall }: { opening: Opening; wall: Wall }) {
  const wallLength = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2)
  );
  const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);

  // Position along wall
  const t = (opening.position + opening.width / 2) / wallLength;
  const x = wall.start.x + t * (wall.end.x - wall.start.x);
  const z = wall.start.z + t * (wall.end.z - wall.start.z);
  const y = opening.sillHeight + opening.height / 2;

  return (
    <mesh position={[x, y, z]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[opening.width, opening.height, wall.thickness + 0.02]} />
      <meshStandardMaterial
        color={opening.type === "door" ? "#6B4226" : "#87CEEB"}
        transparent
        opacity={opening.type === "window" ? 0.4 : 0.7}
      />
    </mesh>
  );
}

function RoofMesh({ roof, levels }: { roof: Roof; levels: GeometryIR["levels"] }) {
  // Calculate bounding box from all walls
  const allWalls = levels.flatMap((l) => l.walls);
  if (allWalls.length === 0) return null;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const w of allWalls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minZ = Math.min(minZ, w.start.z, w.end.z);
    maxZ = Math.max(maxZ, w.start.z, w.end.z);
  }

  const width = maxX - minX + roof.overhang * 2;
  const depth = maxZ - minZ + roof.overhang * 2;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const topLevel = levels[levels.length - 1];
  const roofBaseHeight = topLevel.floorHeight + topLevel.ceilingHeight;

  if (roof.type === "flat") {
    return (
      <mesh position={[centerX, roofBaseHeight + 0.1, centerZ]}>
        <boxGeometry args={[width, 0.2, depth]} />
        <meshStandardMaterial color="#5C4033" />
      </mesh>
    );
  }

  // Gable roof
  const ridgeHeight = (roof.ridgeDirection === "x" ? depth : width) / 2 * Math.tan((roof.pitch * Math.PI) / 180);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const halfW = (roof.ridgeDirection === "x" ? depth : width) / 2;
    s.moveTo(-halfW, 0);
    s.lineTo(0, ridgeHeight);
    s.lineTo(halfW, 0);
    s.closePath();
    return s;
  }, [width, depth, ridgeHeight, roof.ridgeDirection]);

  const extrudeLength = roof.ridgeDirection === "x" ? width : depth;

  return (
    <mesh
      position={[
        centerX - (roof.ridgeDirection === "x" ? extrudeLength / 2 : 0),
        roofBaseHeight,
        centerZ - (roof.ridgeDirection === "x" ? 0 : extrudeLength / 2),
      ]}
      rotation={[
        roof.ridgeDirection === "x" ? -Math.PI / 2 : 0,
        0,
        roof.ridgeDirection === "x" ? 0 : Math.PI / 2,
      ]}
    >
      <extrudeGeometry
        args={[shape, { steps: 1, depth: extrudeLength, bevelEnabled: false }]}
      />
      <meshStandardMaterial color="#8B4513" side={THREE.DoubleSide} />
    </mesh>
  );
}

function BuildingModel({ ir }: { ir: GeometryIR }) {
  return (
    <group>
      {ir.levels.map((level) => (
        <group key={level.id}>
          {/* Floor slab */}
          <mesh position={[0, level.floorHeight - 0.05, 0]}>
            <boxGeometry args={[20, 0.1, 20]} />
            <meshStandardMaterial color="#E8E0D0" transparent opacity={0.3} />
          </mesh>

          {/* Walls */}
          {level.walls.map((wall) => (
            <WallMesh key={wall.id} wall={wall} />
          ))}

          {/* Openings */}
          {level.openings.map((opening) => {
            const wall = level.walls.find((w) => w.id === opening.wallId);
            return wall ? (
              <OpeningMesh key={opening.id} opening={opening} wall={wall} />
            ) : null;
          })}
        </group>
      ))}

      {/* Roof */}
      <RoofMesh roof={ir.roof} levels={ir.levels} />
    </group>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
      <div className="text-6xl opacity-20 mb-3">🏠</div>
      <div className="text-sm text-zinc-400">Your cabin model appears here</div>
      <div className="text-xs text-zinc-300 mt-1">Upload a blueprint or sketch to get started</div>
    </div>
  );
}

export function EditorViewport() {
  const geometryIR = useProjectStore((s) => s.geometryIR);

  return (
    <div className="relative bg-white border border-zinc-200 rounded-xl overflow-hidden" style={{ minHeight: 500 }}>
      {!geometryIR && <EmptyState />}
      <Canvas>
        <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Environment preset="city" />
          {geometryIR && <BuildingModel ir={geometryIR} />}
          <Grid
            args={[50, 50]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#ddd"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#bbb"
            fadeDistance={30}
            position={[0, -0.01, 0]}
          />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}

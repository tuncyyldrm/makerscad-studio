import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import JSZip from 'jszip';
import { ParsedPolyhedron, ColorRGBA, Vertex, Face } from '../types';

export interface ModelPart {
  id: string;
  rootObjectId?: string;
  name: string;
  plateId?: number;
  plateName?: string;
  colorIndex: number;
  colorHex: string;
  triangleCount: number;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  };
  vertices: Vertex[];
  faces: Face[];
}

export interface ModelPlate {
  id: number;
  name: string;
  partIds: string[];
}

export interface ImportedModel {
  polyhedron: ParsedPolyhedron;
  format: 'stl' | 'obj' | '3mf' | 'glb';
  filename: string;
  name: string;
  triangleCount: number;
  vertexCount: number;
  partsCount: number;
  parts: ModelPart[];
  plates: ModelPlate[];
  activePlateId: number | 'all';
  layoutMode: 'arranged' | 'assembled';
  isOverlapping: boolean;
  detectedColors: string[];
  rawBuffer?: ArrayBuffer;
}

const DEFAULT_PALETTE: ColorRGBA[] = [
  [0.0, 0.68, 0.26, 1.0], // Bambu Green (#00AE42)
  [0.91, 0.30, 0.24, 1.0], // Red (#E74C3C)
  [0.95, 0.95, 0.95, 1.0], // White (#F2F2F2)
  [0.16, 0.50, 0.73, 1.0], // Blue (#2980B9)
  [0.95, 0.61, 0.07, 1.0], // Orange (#F39C12)
  [0.56, 0.27, 0.68, 1.0], // Purple (#8E44AD)
  [0.2, 0.2, 0.2, 1.0],    // Dark Gray (#333333)
  [0.9, 0.8, 0.2, 1.0],    // Yellow (#E5CC33)
];

function rgbaToHex(c: ColorRGBA): string {
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function hexToRgba(hex: string): ColorRGBA {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return [0.5, 0.5, 0.5, 1.0];
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b, 1.0];
}

/**
 * Transforms a 3D vertex using 3MF affine matrix [m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32]
 */
function applyTransform(v: Vertex, tStr?: string): Vertex {
  if (!tStr) return { ...v };
  const p = tStr.trim().split(/\s+/).map(Number);
  if (p.length < 12) return { ...v };
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22, m30, m31, m32] = p;
  return {
    x: v.x * m00 + v.y * m10 + v.z * m20 + m30,
    y: v.x * m01 + v.y * m11 + v.z * m21 + m31,
    z: v.x * m02 + v.y * m12 + v.z * m22 + m32,
  };
}

/**
 * Multiplies two 3MF affine matrices (P * C) so component transforms combine with build transforms
 */
function multiplyTransforms(tParent?: string, tChild?: string): string | undefined {
  if (!tParent) return tChild;
  if (!tChild) return tParent;
  const p = tParent.trim().split(/\s+/).map(Number);
  const c = tChild.trim().split(/\s+/).map(Number);
  if (p.length < 12 || c.length < 12) return tParent || tChild;

  const [p00, p01, p02, p10, p11, p12, p20, p21, p22, p30, p31, p32] = p;
  const [c00, c01, c02, c10, c11, c12, c20, c21, c22, c30, c31, c32] = c;

  const r00 = c00 * p00 + c01 * p10 + c02 * p20;
  const r01 = c00 * p01 + c01 * p11 + c02 * p21;
  const r02 = c00 * p02 + c01 * p12 + c02 * p22;

  const r10 = c10 * p00 + c11 * p10 + c12 * p20;
  const r11 = c10 * p01 + c11 * p11 + c12 * p21;
  const r12 = c10 * p02 + c11 * p12 + c12 * p22;

  const r20 = c20 * p00 + c21 * p10 + c22 * p20;
  const r21 = c20 * p01 + c21 * p11 + c22 * p21;
  const r22 = c20 * p02 + c21 * p12 + c22 * p22;

  const r30 = c30 * p00 + c31 * p10 + c32 * p20 + p30;
  const r31 = c30 * p01 + c31 * p11 + c32 * p21 + p31;
  const r32 = c30 * p02 + c31 * p12 + c32 * p22 + p32;

  return `${r00} ${r01} ${r02} ${r10} ${r11} ${r12} ${r20} ${r21} ${r22} ${r30} ${r31} ${r32}`;
}

/**
 * Checks if any two parts have overlapping 3D bounding boxes in their original assembled coordinates
 */
export function checkPartsOverlap(parts: ModelPart[]): boolean {
  if (parts.length <= 1) return false;
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i].bounds;
      const b = parts[j].bounds;
      const overlapX = Math.max(a.min.x, b.min.x) < Math.min(a.max.x, b.max.x) - 0.5;
      const overlapY = Math.max(a.min.y, b.min.y) < Math.min(a.max.y, b.max.y) - 0.5;
      const overlapZ = Math.max(a.min.z, b.min.z) < Math.min(a.max.z, b.max.z) - 0.5;
      if (overlapX && overlapY && overlapZ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates bounds of a set of vertices
 */
function calculateBounds(vertices: Vertex[]) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  vertices.forEach(v => {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    minZ = Math.min(minZ, v.z);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
    maxZ = Math.max(maxZ, v.z);
  });

  if (vertices.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
    };
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: { x: Math.max(0.01, maxX - minX), y: Math.max(0.01, maxY - minY), z: Math.max(0.01, maxZ - minZ) },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
  };
}

/**
 * Auto-Arrange Engine (Tablaya Otomatik Dizilim)
 * Arranges distinct parts cleanly side-by-side on the 256x256mm build plate with customizable padding.
 * Grounding each part to the print bed (Z=0) and preventing any model collision/nesting.
 */
export function buildArrangedPolyhedron(parts: ModelPart[], padding = 12, maxRowWidth = 210): ParsedPolyhedron {
  if (parts.length === 0) {
    return {
      vertices: [],
      faces: [],
      colors: [],
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, size: { x: 0, y: 0, z: 0 } },
    };
  }

  if (parts.length === 1) {
    const p = parts[0];
    const b = p.bounds;
    const newVerts = p.vertices.map(v => ({
      x: v.x - b.center.x,
      y: v.y - b.center.y,
      z: v.z - b.min.z,
    }));
    return {
      vertices: newVerts,
      faces: p.faces.map(f => ({ ...f, colorIndex: 0 })),
      colors: [hexToRgba(p.colorHex)],
      bounds: {
        min: { x: -b.size.x / 2, y: -b.size.y / 2, z: 0 },
        max: { x: b.size.x / 2, y: b.size.y / 2, z: b.size.z },
        size: b.size,
      },
    };
  }

  // Row-based bin packing
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  let totalLayoutW = 0;
  let totalLayoutD = 0;

  const offsets: { dx: number; dy: number; dz: number }[] = [];

  parts.forEach(p => {
    const w = p.bounds.size.x;
    const d = p.bounds.size.y;

    if (curX > 0 && curX + w > maxRowWidth) {
      curX = 0;
      curY += rowHeight + padding;
      rowHeight = 0;
    }

    const targetCenterX = curX + w / 2;
    const targetCenterY = curY + d / 2;

    offsets.push({
      dx: targetCenterX - p.bounds.center.x,
      dy: targetCenterY - p.bounds.center.y,
      dz: -p.bounds.min.z, // Flat on bed Z=0
    });

    curX += w + padding;
    rowHeight = Math.max(rowHeight, d);
    totalLayoutW = Math.max(totalLayoutW, curX);
    totalLayoutD = Math.max(totalLayoutD, curY + rowHeight);
  });

  // Shift whole plate arrangement to center at (0, 0)
  const shiftX = -totalLayoutW / 2;
  const shiftY = -totalLayoutD / 2;

  const combinedVertices: Vertex[] = [];
  const combinedFaces: Face[] = [];
  const colors: ColorRGBA[] = [];

  let globalMaxZ = 0;

  parts.forEach((p, idx) => {
    const offset = offsets[idx];
    const baseVertexIdx = combinedVertices.length;
    colors.push(hexToRgba(p.colorHex));

    p.vertices.forEach(v => {
      const x = v.x + offset.dx + shiftX;
      const y = v.y + offset.dy + shiftY;
      const z = v.z + offset.dz;
      combinedVertices.push({ x, y, z });
      globalMaxZ = Math.max(globalMaxZ, z);
    });

    p.faces.forEach(f => {
      combinedFaces.push({
        vertices: [
          baseVertexIdx + f.vertices[0],
          baseVertexIdx + f.vertices[1],
          baseVertexIdx + f.vertices[2],
        ],
        colorIndex: idx,
      });
    });
  });

  return {
    vertices: combinedVertices,
    faces: combinedFaces,
    colors,
    bounds: {
      min: { x: -totalLayoutW / 2, y: -totalLayoutD / 2, z: 0 },
      max: { x: totalLayoutW / 2, y: totalLayoutD / 2, z: globalMaxZ },
      size: { x: totalLayoutW, y: totalLayoutD, z: globalMaxZ },
    },
  };
}

/**
 * Builds unified polyhedron in original CAD / Assembled coordinates (grounded to bed Z=0 and centered at 0, 0)
 */
export function buildAssembledPolyhedron(parts: ModelPart[]): ParsedPolyhedron {
  if (parts.length === 0) {
    return {
      vertices: [],
      faces: [],
      colors: [],
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, size: { x: 0, y: 0, z: 0 } },
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  parts.forEach(p => {
    p.vertices.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
    });
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetZ = minZ;

  const combinedVertices: Vertex[] = [];
  const combinedFaces: Face[] = [];
  const colors: ColorRGBA[] = [];

  parts.forEach((p, idx) => {
    const baseVertexIdx = combinedVertices.length;
    colors.push(hexToRgba(p.colorHex));

    p.vertices.forEach(v => {
      combinedVertices.push({
        x: v.x - centerX,
        y: v.y - centerY,
        z: v.z - offsetZ,
      });
    });

    p.faces.forEach(f => {
      combinedFaces.push({
        vertices: [
          baseVertexIdx + f.vertices[0],
          baseVertexIdx + f.vertices[1],
          baseVertexIdx + f.vertices[2],
        ],
        colorIndex: idx,
      });
    });
  });

  const size = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
  };

  return {
    vertices: combinedVertices,
    faces: combinedFaces,
    colors,
    bounds: {
      min: { x: -size.x / 2, y: -size.y / 2, z: 0 },
      max: { x: size.x / 2, y: size.y / 2, z: size.z },
      size,
    },
  };
}

/**
 * Filter imported model by Plate or switch between Arranged and Assembled layout
 */
export function filterModelByPlate(
  model: ImportedModel,
  plateId: number | 'all',
  layoutMode: 'arranged' | 'assembled'
): ImportedModel {
  const filteredParts = plateId === 'all'
    ? model.parts
    : model.parts.filter(p => p.plateId === plateId);

  const partsToDisplay = filteredParts.length > 0 ? filteredParts : model.parts;
  const polyhedron = layoutMode === 'arranged'
    ? buildArrangedPolyhedron(partsToDisplay, 12)
    : buildAssembledPolyhedron(partsToDisplay);

  return {
    ...model,
    activePlateId: plateId,
    layoutMode,
    polyhedron,
  };
}

/**
 * Legacy autoArrangePolyhedron for backwards compatibility
 */
export function autoArrangePolyhedron(polyhedron: ParsedPolyhedron, padding = 10): ParsedPolyhedron {
  const partMap = new Map<number, Face[]>();
  polyhedron.faces.forEach(f => {
    const list = partMap.get(f.colorIndex) || [];
    list.push(f);
    partMap.set(f.colorIndex, list);
  });

  if (partMap.size <= 1) return polyhedron;

  const parts: ModelPart[] = [];
  partMap.forEach((faces, colorIdx) => {
    const vMap = new Map<number, number>();
    const partVerts: Vertex[] = [];
    const partFaces: Face[] = [];

    faces.forEach(f => {
      const vIndices: number[] = [];
      f.vertices.forEach(oldIdx => {
        let newIdx = vMap.get(oldIdx);
        if (newIdx === undefined) {
          newIdx = partVerts.length;
          partVerts.push({ ...polyhedron.vertices[oldIdx] });
          vMap.set(oldIdx, newIdx);
        }
        vIndices.push(newIdx);
      });
      if (vIndices.length >= 3) {
        partFaces.push({ vertices: [vIndices[0], vIndices[1], vIndices[2]], colorIndex: colorIdx });
      }
    });

    const b = calculateBounds(partVerts);
    const colRgba = polyhedron.colors[colorIdx] || DEFAULT_PALETTE[colorIdx % DEFAULT_PALETTE.length];
    parts.push({
      id: `legacy_${colorIdx}`,
      name: `Part ${colorIdx + 1}`,
      colorIndex: colorIdx,
      colorHex: rgbaToHex(colRgba),
      triangleCount: partFaces.length,
      bounds: b,
      vertices: partVerts,
      faces: partFaces,
    });
  });

  return buildArrangedPolyhedron(parts, padding);
}

/**
 * Connected Component / Island separation
 * If a single mesh actually consists of multiple disconnected bodies (shells),
 * separates them so they can be independently arranged and colored.
 */
export function separateIslands(vertices: Vertex[], faces: Face[]): ModelPart[] {
  const n = vertices.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;

  function find(i: number): number {
    let root = i;
    while (root !== parent[root]) root = parent[root];
    let curr = i;
    while (curr !== root) {
      const next = parent[curr];
      parent[curr] = root;
      curr = next;
    }
    return root;
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  for (let f = 0; f < faces.length; f++) {
    const v = faces[f].vertices;
    union(v[0], v[1]);
    union(v[1], v[2]);
  }

  const groups = new Map<number, Face[]>();
  for (let f = 0; f < faces.length; f++) {
    const root = find(faces[f].vertices[0]);
    let list = groups.get(root);
    if (!list) {
      list = [];
      groups.set(root, list);
    }
    list.push(faces[f]);
  }

  // Filter out tiny noise clusters (< 15 faces)
  const validGroups = Array.from(groups.values()).filter(g => g.length >= 15);
  if (validGroups.length <= 1) {
    const b = calculateBounds(vertices);
    return [
      {
        id: 'part_1',
        name: 'Model Body',
        colorIndex: 0,
        colorHex: rgbaToHex(DEFAULT_PALETTE[0]),
        triangleCount: faces.length,
        bounds: b,
        vertices,
        faces,
      },
    ];
  }

  const parts: ModelPart[] = [];
  validGroups.forEach((faceList, idx) => {
    const vMap = new Map<number, number>();
    const partVerts: Vertex[] = [];
    const partFaces: Face[] = [];

    faceList.forEach(f => {
      const vIndices: number[] = [];
      f.vertices.forEach(oldIdx => {
        let newIdx = vMap.get(oldIdx);
        if (newIdx === undefined) {
          newIdx = partVerts.length;
          partVerts.push({ ...vertices[oldIdx] });
          vMap.set(oldIdx, newIdx);
        }
        vIndices.push(newIdx);
      });
      if (vIndices.length >= 3) {
        partFaces.push({ vertices: [vIndices[0], vIndices[1], vIndices[2]], colorIndex: idx });
      }
    });

    const b = calculateBounds(partVerts);
    const col = DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
    parts.push({
      id: `part_${idx + 1}`,
      name: `Parça ${idx + 1}`,
      colorIndex: idx,
      colorHex: rgbaToHex(col),
      triangleCount: partFaces.length,
      bounds: b,
      vertices: partVerts,
      faces: partFaces,
    });
  });

  return parts;
}

/**
 * Parse STL File (Binary or ASCII) with Island Separation
 */
export function parseStl(buffer: ArrayBuffer, filename: string): ImportedModel {
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);

  const pos = geometry.getAttribute('position');
  const vertices: Vertex[] = [];
  const faces: Face[] = [];

  if (pos) {
    for (let i = 0; i < pos.count; i += 3) {
      vertices.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
      vertices.push({ x: pos.getX(i + 1), y: pos.getY(i + 1), z: pos.getZ(i + 1) });
      vertices.push({ x: pos.getX(i + 2), y: pos.getY(i + 2), z: pos.getZ(i + 2) });
      faces.push({ vertices: [i, i + 1, i + 2], colorIndex: 0 });
    }
  }

  const parts = separateIslands(vertices, faces);
  const isOverlapping = checkPartsOverlap(parts);
  const layoutMode = (parts.length > 1 && isOverlapping) ? 'arranged' : 'assembled';

  const polyhedron = layoutMode === 'arranged'
    ? buildArrangedPolyhedron(parts, 12)
    : buildAssembledPolyhedron(parts);

  return {
    polyhedron,
    format: 'stl',
    filename,
    name: filename.replace(/\.stl$/i, ''),
    triangleCount: polyhedron.faces.length,
    vertexCount: polyhedron.vertices.length,
    partsCount: parts.length,
    parts,
    plates: [],
    activePlateId: 'all',
    layoutMode,
    isOverlapping,
    detectedColors: polyhedron.colors.map(rgbaToHex),
    rawBuffer: buffer,
  };
}

/**
 * Extracts all meshes from a Three.js scene/group with transforms applied
 */
function extractMeshesFromObject(object: THREE.Object3D): { geometry: THREE.BufferGeometry; color: ColorRGBA; name?: string }[] {
  object.updateMatrixWorld(true);
  const items: { geometry: THREE.BufferGeometry; color: ColorRGBA; name?: string }[] = [];
  let defaultColorIdx = 0;

  object.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry) return;

      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);

      let color: ColorRGBA = DEFAULT_PALETTE[defaultColorIdx % DEFAULT_PALETTE.length];
      if (mesh.material) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if ((mat as any).color instanceof THREE.Color) {
          const c = (mat as any).color;
          color = [c.r, c.g, c.b, 1.0];
        }
      }
      defaultColorIdx++;

      items.push({
        geometry: geom,
        color,
        name: mesh.name || `Part ${items.length + 1}`,
      });
    }
  });

  return items;
}

/**
 * Converts Three.js BufferGeometries into ModelParts
 */
function meshItemsToParts(meshItems: { geometry: THREE.BufferGeometry; color: ColorRGBA; name?: string }[]): ModelPart[] {
  const parts: ModelPart[] = [];

  meshItems.forEach((item, idx) => {
    const geom = item.geometry;
    const pos = geom.getAttribute('position');
    if (!pos) return;

    const index = geom.getIndex();
    const vertices: Vertex[] = [];
    const faces: Face[] = [];

    if (index) {
      for (let i = 0; i < pos.count; i++) {
        vertices.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
      }
      for (let i = 0; i < index.count; i += 3) {
        faces.push({
          vertices: [index.getX(i), index.getX(i + 1), index.getX(i + 2)],
          colorIndex: idx,
        });
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        vertices.push({ x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) });
        vertices.push({ x: pos.getX(i + 1), y: pos.getY(i + 1), z: pos.getZ(i + 1) });
        vertices.push({ x: pos.getX(i + 2), y: pos.getY(i + 2), z: pos.getZ(i + 2) });
        faces.push({ vertices: [i, i + 1, i + 2], colorIndex: idx });
      }
    }

    const b = calculateBounds(vertices);
    parts.push({
      id: `part_${idx + 1}`,
      name: item.name || `Parça ${idx + 1}`,
      colorIndex: idx,
      colorHex: rgbaToHex(item.color),
      triangleCount: faces.length,
      bounds: b,
      vertices,
      faces,
    });
  });

  return parts;
}

/**
 * Parse OBJ File
 */
export function parseObj(textOrBuffer: string | ArrayBuffer, filename: string): ImportedModel {
  const loader = new OBJLoader();
  const text = typeof textOrBuffer === 'string' ? textOrBuffer : new TextDecoder('utf-8').decode(textOrBuffer);
  const group = loader.parse(text);

  const meshItems = extractMeshesFromObject(group);
  let parts = meshItemsToParts(meshItems);

  if (parts.length === 1) {
    const separated = separateIslands(parts[0].vertices, parts[0].faces);
    if (separated.length > 1) {
      parts = separated;
    }
  }

  const isOverlapping = checkPartsOverlap(parts);
  const layoutMode = (parts.length > 1 && isOverlapping) ? 'arranged' : 'assembled';

  const polyhedron = layoutMode === 'arranged'
    ? buildArrangedPolyhedron(parts, 12)
    : buildAssembledPolyhedron(parts);

  return {
    polyhedron,
    format: 'obj',
    filename,
    name: filename.replace(/\.obj$/i, ''),
    triangleCount: polyhedron.faces.length,
    vertexCount: polyhedron.vertices.length,
    partsCount: parts.length,
    parts,
    plates: [],
    activePlateId: 'all',
    layoutMode,
    isOverlapping,
    detectedColors: polyhedron.colors.map(rgbaToHex),
    rawBuffer: typeof textOrBuffer === 'string' ? undefined : textOrBuffer,
  };
}

/**
 * Universal, Bulletproof 3MF Parser
 * - Reads all .model XML files inside 3MF ZIP archive (supports Bambu Studio, OrcaSlicer, PrusaSlicer, Cura, Fusion 360)
 * - Directly parses meshes, vertices, and triangles without crashing on unhandled namespace/component references
 * - Extracts Bambu Studio / OrcaSlicer plates, triangle paint_color, base materials, and project filament colors
 * - Pre-computes both Arranged (Slicer Bed) and Assembled (CAD Origin) layouts
 */
export async function parse3mf(buffer: ArrayBuffer, filename: string): Promise<ImportedModel> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    // 1. Check Bambu / Orca / Anycubic project & model settings config to extract filament colors and plates
    const filamentColors: string[] = [];
    const plates: ModelPlate[] = [];
    const objectPlateMap = new Map<string, number>();
    const objectExtruderMap = new Map<string, number>();
    const objectColorMap = new Map<string, string>();

    const projectSettingsEntry = zip.file('Metadata/project_settings.config');
    if (projectSettingsEntry) {
      try {
        const configText = await projectSettingsEntry.async('string');
        try {
          const json = JSON.parse(configText);
          if (Array.isArray(json.filament_colour)) {
            json.filament_colour.forEach((c: any) => {
              if (typeof c === 'string' && c.trim()) {
                const clean = c.trim().toUpperCase();
                filamentColors.push(clean.startsWith('#') ? clean : '#' + clean);
              }
            });
          }
        } catch (_) {
          const match = configText.match(/key="filament_colour"\s+value="([^"]+)"/i);
          if (match) {
            match[1].split(';').forEach(c => {
              if (c.trim()) {
                const clean = c.trim().toUpperCase();
                filamentColors.push(clean.startsWith('#') ? clean : '#' + clean);
              }
            });
          }
        }
      } catch (_) {}
    }

    const modelSettingsEntry = zip.file('Metadata/model_settings.config');
    if (modelSettingsEntry) {
      try {
        const xml = await modelSettingsEntry.async('string');
        const plateRegex = /<plate\b[^>]*>([\s\S]*?)<\/plate>/gi;
        let pMatch;
        while ((pMatch = plateRegex.exec(xml)) !== null) {
          const body = pMatch[1];
          const idMatch = body.match(/<metadata\s+key=["']plater_id["']\s+value=["']([^"']+)["']/i);
          const nameMatch = body.match(/<metadata\s+key=["']plater_name["']\s+value=["']([^"']*)["']/i);
          const plateId = idMatch ? parseInt(idMatch[1], 10) : plates.length + 1;
          const plateName = nameMatch && nameMatch[1] ? nameMatch[1] : `Tabla ${plateId}`;

          const partIds: string[] = [];
          const instRegex = /<metadata\s+key=["']object_id["']\s+value=["']([^"']+)["']/gi;
          let iMatch;
          while ((iMatch = instRegex.exec(body)) !== null) {
            partIds.push(iMatch[1]);
            objectPlateMap.set(iMatch[1], plateId);
          }

          if (partIds.length > 0) {
            plates.push({ id: plateId, name: plateName, partIds });
          }
        }

        // Extract part extruder and color metadata
        const partRegex = /<(?:part|object)\s+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:part|object)>/gi;
        let ptMatch;
        while ((ptMatch = partRegex.exec(xml)) !== null) {
          const pId = ptMatch[1];
          const pBody = ptMatch[2];
          const extMatch = pBody.match(/<metadata\s+key=["']extruder["']\s+value=["']([0-9]+)["']/i);
          if (extMatch) {
            objectExtruderMap.set(pId, parseInt(extMatch[1], 10));
          }
          const colMatch = pBody.match(/<metadata\s+key=["']color["']\s+value=["']#?([0-9a-fA-F]{6})["']/i);
          if (colMatch) {
            objectColorMap.set(pId, '#' + colMatch[1].toUpperCase());
          }
        }
      } catch (_) {}
    }

    // 2. Find all model XML files in the ZIP archive
    const modelFiles: { name: string; content: string }[] = [];
    for (const [path, entry] of Object.entries(zip.files)) {
      if (path.toLowerCase().endsWith('.model') && !entry.dir) {
        const content = await entry.async('string');
        modelFiles.push({ name: path, content });
      }
    }

    interface Raw3mfObject {
      id: string;
      name: string;
      vertices?: Vertex[];
      subPartsByColor?: Map<string, number[]>;
      components?: { objectId: string; transform?: string }[];
    }

    const rawObjects = new Map<string, Raw3mfObject>();
    const allBuildItems: { objectId: string; transform?: string }[] = [];
    let colorCounter = 0;

    for (const mf of modelFiles) {
      const xml = mf.content;

      // Parse base materials / color groups
      const colorMap = new Map<string, string>();
      const baseRegex = /<(?:\w+:)?base\b([^>]*)\/?>/gi;
      let bMatch;
      let bIdx = 0;
      while ((bMatch = baseRegex.exec(xml)) !== null) {
        const colMatch = bMatch[1].match(/displaycolor=["']#?([0-9a-fA-F]{6,8})["']/i);
        if (colMatch) {
          colorMap.set(`base_${bIdx}`, '#' + colMatch[1].substring(0, 6).toUpperCase());
        }
        bIdx++;
      }

      const colgroupRegex = /<(?:\w+:)?color\b([^>]*)\/?>/gi;
      let cMatch;
      let cIdx = 0;
      while ((cMatch = colgroupRegex.exec(xml)) !== null) {
        const colMatch = cMatch[1].match(/color=["']#?([0-9a-fA-F]{6,8})["']/i);
        if (colMatch) {
          colorMap.set(`color_${cIdx}`, '#' + colMatch[1].substring(0, 6).toUpperCase());
        }
        cIdx++;
      }

      // Parse <build><item objectid="..." transform="..." /></build>
      const buildRegex = /<(?:\w+:)?build\b[^>]*>([\s\S]*?)<\/(?:\w+:)?build>/i;
      const bMatchRegex = xml.match(buildRegex);
      if (bMatchRegex) {
        const itemRegex = /<(?:\w+:)?item\b([^>]*)\/?>/gi;
        let im;
        while ((im = itemRegex.exec(bMatchRegex[1])) !== null) {
          const objId = im[1].match(/objectid=["']([^"']+)["']/i);
          const trans = im[1].match(/transform=["']([^"']+)["']/i);
          if (objId) {
            allBuildItems.push({
              objectId: objId[1],
              transform: trans ? trans[1] : undefined,
            });
          }
        }
      }

      // Parse all <object> definitions
      const objectRegex = /<(?:\w+:)?object\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?object>/gi;
      let objMatch;

      while ((objMatch = objectRegex.exec(xml)) !== null) {
        const objAttrs = objMatch[1];
        const objBody = objMatch[2];

        const idMatch = objAttrs.match(/\bid=["']([^"']+)["']/i);
        if (!idMatch) continue;
        const objId = idMatch[1];

        const nameMatch = objAttrs.match(/\bname=["']([^"']+)["']/i);
        const partName = nameMatch ? nameMatch[1] : `Part ${objId}`;

        // Check for <components><component objectid="..." transform="..." /></components>
        const components: { objectId: string; transform?: string }[] = [];
        const compRegex = /<(?:\w+:)?component\b([^>]*)\/?>/gi;
        let cm;
        while ((cm = compRegex.exec(objBody)) !== null) {
          const cId = cm[1].match(/objectid=["']([^"']+)["']/i);
          const cTr = cm[1].match(/transform=["']([^"']+)["']/i);
          if (cId) {
            components.push({
              objectId: cId[1],
              transform: cTr ? cTr[1] : undefined,
            });
          }
        }

        // Extract vertices if <mesh> exists
        const vertices: Vertex[] = [];
        const vRegex = /<(?:\w+:)?vertex\b([^>]*)\/?>/gi;
        let vMatch;
        while ((vMatch = vRegex.exec(objBody)) !== null) {
          const attrs = vMatch[1];
          const x = attrs.match(/x=["']([0-9.eE+-]+)["']/i);
          const y = attrs.match(/y=["']([0-9.eE+-]+)["']/i);
          const z = attrs.match(/z=["']([0-9.eE+-]+)["']/i);
          if (x && y && z) {
            vertices.push({
              x: parseFloat(x[1]),
              y: parseFloat(y[1]),
              z: parseFloat(z[1]),
            });
          }
        }

        const subPartsByColor = new Map<string, number[]>();
        if (vertices.length > 0) {
          const tRegex = /<(?:\w+:)?triangle\b([^>]*)\/?>/gi;
          let tMatch;

          while ((tMatch = tRegex.exec(objBody)) !== null) {
            const attrs = tMatch[1];
            const v1 = attrs.match(/v1=["']([0-9]+)["']/i);
            const v2 = attrs.match(/v2=["']([0-9]+)["']/i);
            const v3 = attrs.match(/v3=["']([0-9]+)["']/i);
            const paint = attrs.match(/paint_color=["']#?([0-9a-fA-F]+)["']/i);
            const p1 = attrs.match(/\bp1=["']([0-9]+)["']/i);

            if (v1 && v2 && v3) {
              let hex: string | undefined;

              // 1. Decode MM painting (1C, 2C, 3C or #RRGGBB)
              if (paint) {
                const pVal = paint[1].trim();
                if (/^[0-9a-fA-F]C$/i.test(pVal)) {
                  const extNum = parseInt(pVal[0], 16);
                  if (extNum > 0 && filamentColors[extNum - 1]) {
                    hex = filamentColors[extNum - 1];
                  }
                } else if (pVal.length === 6) {
                  hex = '#' + pVal.toUpperCase();
                }
              }

              // 2. Decode base material / color group index
              if (!hex && p1) {
                hex = colorMap.get(`base_${p1[1]}`) || colorMap.get(`color_${p1[1]}`);
              }

              // 3. Decode object-level color or extruder from model_settings.config
              if (!hex && objectColorMap.has(objId)) {
                hex = objectColorMap.get(objId);
              }
              if (!hex && objectExtruderMap.has(objId)) {
                const ext = objectExtruderMap.get(objId)!;
                if (filamentColors[ext - 1]) {
                  hex = filamentColors[ext - 1];
                }
              }

              // 4. Fallback to filamentColors list or default palette
              if (!hex && filamentColors[colorCounter]) {
                hex = filamentColors[colorCounter];
              }
              if (!hex) {
                const palCol = DEFAULT_PALETTE[colorCounter % DEFAULT_PALETTE.length];
                hex = rgbaToHex(palCol);
              }

              const triIndices = subPartsByColor.get(hex) || [];
              triIndices.push(parseInt(v1[1], 10), parseInt(v2[1], 10), parseInt(v3[1], 10));
              subPartsByColor.set(hex, triIndices);
            }
          }
          colorCounter++;
        }

        rawObjects.set(objId, {
          id: objId,
          name: partName,
          vertices: vertices.length > 0 ? vertices : undefined,
          subPartsByColor: subPartsByColor.size > 0 ? subPartsByColor : undefined,
          components: components.length > 0 ? components : undefined,
        });
      }
    }

    // 3. Resolve objects and apply full transform hierarchy from <build> & <components>
    const parts: ModelPart[] = [];
    let colorIdxCounter = 0;

    function instantiateObject(objId: string, rootObjectId: string, transform?: string, depth = 0) {
      if (depth > 10) return;
      const obj = rawObjects.get(objId);
      if (!obj) return;

      if (obj.components && obj.components.length > 0) {
        for (const comp of obj.components) {
          const combined = multiplyTransforms(transform, comp.transform);
          instantiateObject(comp.objectId, rootObjectId, combined, depth + 1);
        }
      }

      if (obj.vertices && obj.subPartsByColor && obj.subPartsByColor.size > 0) {
        obj.subPartsByColor.forEach((triangles, hexColor) => {
          const partVerts: Vertex[] = [];
          const partFaces: Face[] = [];
          const vertIndexMap = new Map<number, number>();

          for (let i = 0; i < triangles.length; i += 3) {
            const faceIndices: number[] = [];
            for (let k = 0; k < 3; k++) {
              const origVIdx = triangles[i + k];
              let newVIdx = vertIndexMap.get(origVIdx);
              if (newVIdx === undefined) {
                const origV = obj.vertices![origVIdx];
                const transformed = applyTransform(origV, transform);
                newVIdx = partVerts.length;
                partVerts.push(transformed);
                vertIndexMap.set(origVIdx, newVIdx);
              }
              faceIndices.push(newVIdx);
            }
            if (faceIndices.length >= 3) {
              partFaces.push({
                vertices: [faceIndices[0], faceIndices[1], faceIndices[2]],
                colorIndex: colorIdxCounter,
              });
            }
          }

          const plateId = objectPlateMap.get(rootObjectId);
          const matchingPlate = plates.find(p => p.id === plateId);
          const b = calculateBounds(partVerts);

          parts.push({
            id: `part_${parts.length + 1}`,
            rootObjectId,
            name: obj.name,
            plateId,
            plateName: matchingPlate?.name,
            colorIndex: colorIdxCounter,
            colorHex: hexColor,
            triangleCount: partFaces.length,
            bounds: b,
            vertices: partVerts,
            faces: partFaces,
          });

          colorIdxCounter++;
        });
      }
    }

    if (allBuildItems.length > 0) {
      allBuildItems.forEach(item => {
        instantiateObject(item.objectId, item.objectId, item.transform);
      });
    } else {
      rawObjects.forEach(obj => {
        if (obj.vertices && obj.subPartsByColor && obj.subPartsByColor.size > 0) {
          instantiateObject(obj.id, obj.id, undefined);
        }
      });
    }

    if (parts.length > 0) {
      const isOverlapping = checkPartsOverlap(parts);
      // If parts overlap OR multi-plate project, default to Slicer 'arranged' layout
      const layoutMode = (parts.length > 1 || plates.length > 1 || isOverlapping) ? 'arranged' : 'assembled';

      const polyhedron = layoutMode === 'arranged'
        ? buildArrangedPolyhedron(parts, 12)
        : buildAssembledPolyhedron(parts);

      return {
        polyhedron,
        format: '3mf',
        filename,
        name: filename.replace(/\.3mf$/i, ''),
        triangleCount: polyhedron.faces.length,
        vertexCount: polyhedron.vertices.length,
        partsCount: parts.length,
        parts,
        plates,
        activePlateId: 'all',
        layoutMode,
        isOverlapping,
        detectedColors: polyhedron.colors.map(rgbaToHex),
        rawBuffer: buffer,
      };
    }
  } catch (nativeErr) {
    console.warn('Native 3MF parsing encountered an error, trying ThreeMFLoader fallback:', nativeErr);
  }

  // Graceful Fallback: ThreeMFLoader
  try {
    const loader = new ThreeMFLoader();
    const group = await loader.parse(buffer);
    const meshItems = extractMeshesFromObject(group);
    let parts = meshItemsToParts(meshItems);

    if (parts.length === 1) {
      const separated = separateIslands(parts[0].vertices, parts[0].faces);
      if (separated.length > 1) {
        parts = separated;
      }
    }

    const isOverlapping = checkPartsOverlap(parts);
    const layoutMode = (parts.length > 1 && isOverlapping) ? 'arranged' : 'assembled';

    const polyhedron = layoutMode === 'arranged'
      ? buildArrangedPolyhedron(parts, 12)
      : buildAssembledPolyhedron(parts);

    return {
      polyhedron,
      format: '3mf',
      filename,
      name: filename.replace(/\.3mf$/i, ''),
      triangleCount: polyhedron.faces.length,
      vertexCount: polyhedron.vertices.length,
      partsCount: parts.length,
      parts,
      plates: [],
      activePlateId: 'all',
      layoutMode,
      isOverlapping,
      detectedColors: polyhedron.colors.map(rgbaToHex),
      rawBuffer: buffer,
    };
  } catch (fallbackErr: any) {
    console.error('ThreeMFLoader fallback failed:', fallbackErr);
    throw new Error(
      `Bu 3MF dosyası okunamadı (${fallbackErr.message || 'Geçersiz 3MF yapısı'}). Lütfen dosyanın bozuk olmadığından emin olun veya STL/OBJ olarak yükleyin.`
    );
  }
}

/**
 * Parse GLB / GLTF File
 */
export async function parseGlb(buffer: ArrayBuffer, filename: string): Promise<ImportedModel> {
  const loader = new GLTFLoader();

  return new Promise<ImportedModel>((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      gltf => {
        const scene = gltf.scene;
        scene.rotation.x = Math.PI / 2;
        scene.updateMatrixWorld(true);

        const meshItems = extractMeshesFromObject(scene);
        let parts = meshItemsToParts(meshItems);

        if (parts.length === 1) {
          const separated = separateIslands(parts[0].vertices, parts[0].faces);
          if (separated.length > 1) {
            parts = separated;
          }
        }

        const isOverlapping = checkPartsOverlap(parts);
        const layoutMode = (parts.length > 1 && isOverlapping) ? 'arranged' : 'assembled';

        const polyhedron = layoutMode === 'arranged'
          ? buildArrangedPolyhedron(parts, 12)
          : buildAssembledPolyhedron(parts);

        resolve({
          polyhedron,
          format: 'glb',
          filename,
          name: filename.replace(/\.(glb|gltf)$/i, ''),
          triangleCount: polyhedron.faces.length,
          vertexCount: polyhedron.vertices.length,
          partsCount: parts.length,
          parts,
          plates: [],
          activePlateId: 'all',
          layoutMode,
          isOverlapping,
          detectedColors: polyhedron.colors.map(rgbaToHex),
          rawBuffer: buffer,
        });
      },
      err => {
        reject(new Error(`Failed to parse GLTF/GLB: ${err}`));
      }
    );
  });
}

/**
 * High-level import dispatcher for all supported 3D formats (.stl, .obj, .3mf, .glb / .gltf)
 */
export async function import3dModelFile(file: File): Promise<ImportedModel> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const buffer = await file.arrayBuffer();

  switch (ext) {
    case 'stl':
      return parseStl(buffer, file.name);
    case 'obj':
      return parseObj(buffer, file.name);
    case '3mf':
      return parse3mf(buffer, file.name);
    case 'glb':
    case 'gltf':
      return parseGlb(buffer, file.name);
    default:
      throw new Error(`Desteklenmeyen dosya formatı: .${ext}. (.stl, .obj, .3mf, .glb dosyaları desteklenir)`);
  }
}

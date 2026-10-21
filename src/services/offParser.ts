import { ColorRGBA, Face, ParsedPolyhedron, Vertex } from '../types';

export const DEFAULT_COLOR: ColorRGBA = [0.0, 0.682, 0.259, 1.0]; // #00AE42 Bambu Green

export function parseOff(content: string): ParsedPolyhedron {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    throw new Error('OFF output is empty');
  }

  let counts: string;
  let currentLine = 0;

  if (lines[0].startsWith('OFF') && lines[0].length > 3) {
    counts = lines[0].substring(3).trim();
    currentLine = 1;
  } else if (lines[currentLine] === 'OFF' && lines.length > 1) {
    counts = lines[1];
    currentLine = 2;
  } else {
    throw new Error('Invalid OFF format: missing OFF header');
  }

  const [numVertices, numFaces] = counts.split(/\s+/).map(Number);
  if (isNaN(numVertices) || isNaN(numFaces)) {
    throw new Error('Invalid vertex/face count in OFF header');
  }

  const vertices: Vertex[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < numVertices; i++) {
    const parts = lines[currentLine + i].split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
      continue;
    }
    const x = parts[0];
    const y = parts[1];
    const z = parts[2];

    vertices.push({ x, y, z });

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  currentLine += numVertices;

  const colors: ColorRGBA[] = [];
  const colorMap = new Map<string, number>();

  const faces: Face[] = [];
  for (let i = 0; i < numFaces; i++) {
    const lineIndex = currentLine + i;
    if (lineIndex >= lines.length) break;

    const parts = lines[lineIndex].split(/\s+/).map(Number);
    const numVerts = parts[0];
    const faceVerts = parts.slice(1, numVerts + 1);

    // Color could be 3 floats/ints (RGB) or 4 (RGBA)
    let color: ColorRGBA = DEFAULT_COLOR;
    if (parts.length >= numVerts + 4) {
      const r = parts[numVerts + 1] > 1 ? parts[numVerts + 1] / 255 : parts[numVerts + 1];
      const g = parts[numVerts + 2] > 1 ? parts[numVerts + 2] / 255 : parts[numVerts + 2];
      const b = parts[numVerts + 3] > 1 ? parts[numVerts + 3] / 255 : parts[numVerts + 3];
      const a = parts.length >= numVerts + 5
        ? (parts[numVerts + 4] > 1 ? parts[numVerts + 4] / 255 : parts[numVerts + 4])
        : 1.0;
      color = [r, g, b, a];
    }

    const colorKey = `${color[0].toFixed(3)},${color[1].toFixed(3)},${color[2].toFixed(3)},${color[3].toFixed(3)}`;
    let colorIndex = colorMap.get(colorKey);
    if (colorIndex === undefined) {
      colorIndex = colors.length;
      colors.push(color);
      colorMap.set(colorKey, colorIndex);
    }

    if (faceVerts.length === 3) {
      faces.push({
        vertices: [faceVerts[0], faceVerts[1], faceVerts[2]],
        colorIndex,
      });
    } else if (faceVerts.length > 3) {
      // Triangulate n-gon via triangle fan
      for (let j = 1; j < faceVerts.length - 1; j++) {
        faces.push({
          vertices: [faceVerts[0], faceVerts[j], faceVerts[j + 1]],
          colorIndex,
        });
      }
    }
  }

  if (vertices.length === 0) {
    minX = minY = minZ = maxX = maxY = maxZ = 0;
  }

  return {
    vertices,
    faces,
    colors,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    },
  };
}

export interface ParameterOption {
  name: string;
  value: string | number;
}

export interface ScadParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'vector';
  group?: string;
  initial: any;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
  description?: string;
}

export interface ParameterSet {
  title?: string;
  parameters: ScadParameter[];
}

export interface Vertex {
  x: number;
  y: number;
  z: number;
}

export interface Face {
  vertices: [number, number, number];
  colorIndex: number;
}

export type ColorRGBA = [number, number, number, number];

export interface ParsedPolyhedron {
  vertices: Vertex[];
  faces: Face[];
  colors: ColorRGBA[];
  bounds: {
    min: Vertex;
    max: Vertex;
    size: Vertex;
  };
}

export interface AmsSlot {
  id: number; // 1, 2, 3, 4
  name: string;
  colorHex: string;
  materialType: string; // PLA, PETG, ABS, TPU
}

export interface ExportSettings {
  format: '3mf' | 'stl' | 'obj';
  separateParts: boolean;
  generateBambuMetadata: boolean;
}

export interface CustomFont {
  name: string;
  displayName: string;
  data: ArrayBuffer;
  style?: string;
}

export interface RenderResult {
  polyhedron: ParsedPolyhedron | null;
  rawOff: string;
  stdout: string;
  stderr: string;
  elapsedMs: number;
  error?: string;
}

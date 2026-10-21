import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import chroma from 'chroma-js';
import { AmsSlot, ColorRGBA, ParsedPolyhedron, Vertex } from '../types';

// Paint color map for Bambu Studio / PrusaSlicer multi-material painting
const PAINT_COLOR_MAP = ['1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', 'AC', 'BC', 'CC', 'DC', 'EC', 'FC', '0C'];

function rgbaToHex(color: ColorRGBA): string {
  const r = Math.round(Math.min(255, Math.max(0, color[0] * 255)));
  const g = Math.round(Math.min(255, Math.max(0, color[1] * 255)));
  const b = Math.round(Math.min(255, Math.max(0, color[2] * 255)));
  return chroma([r, g, b]).hex().toUpperCase();
}

/**
 * Matches model colors to user-specified AMS slots based on CIELAB deltaE distance.
 */
function mapColorsToAms(modelColors: ColorRGBA[], amsSlots: AmsSlot[]): number[] {
  if (amsSlots.length === 0) {
    return modelColors.map((_, i) => i);
  }

  const amsLabs = amsSlots.map(slot => chroma(slot.colorHex).lab());

  return modelColors.map(color => {
    const [r, g, b] = color.map(c => Math.round(c * 255));
    const targetLab = chroma([r, g, b]).lab();

    let closestSlotIdx = 0;
    let minDelta = Infinity;

    amsLabs.forEach((amsLab, slotIdx) => {
      const dL = targetLab[0] - amsLab[0];
      const da = targetLab[1] - amsLab[1];
      const db = targetLab[2] - amsLab[2];
      const dist = Math.sqrt(dL * dL + da * da + db * db);
      if (dist < minDelta) {
        minDelta = dist;
        closestSlotIdx = slotIdx;
      }
    });

    return closestSlotIdx;
  });
}

export async function generateMakerWorld3mf(
  model: ParsedPolyhedron,
  modelName: string = 'OpenSCAD_Model',
  amsSlots: AmsSlot[] = []
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Determine colors and extruder mapping
  const numColors = Math.max(1, model.colors.length);
  const hexColors = model.colors.map(rgbaToHex);
  
  // If AMS slots are provided, map each color index to an AMS slot (1-based for Bambu Studio)
  const amsIndices = amsSlots.length > 0
    ? mapColorsToAms(model.colors, amsSlots)
    : model.colors.map((_, i) => i);

  // Group faces by color index
  const facesByColor = new Map<number, typeof model.faces>();
  model.faces.forEach(face => {
    const list = facesByColor.get(face.colorIndex) || [];
    list.push(face);
    facesByColor.set(face.colorIndex, list);
  });

  const rootAssemblyUuid = uuidv4();
  const buildUuid = uuidv4();

  // Create separate sub-objects for each color (Part 1, Part 2, etc.)
  // This allows Bambu Studio / OrcaSlicer to display each part in the Assembly tree!
  const subObjectXmlParts: string[] = [];
  const componentRefsXml: string[] = [];
  const modelSettingsPartsXml: string[] = [];

  let nextObjectId = 2; // ID 1 is reserved for root assembly

  facesByColor.forEach((faces, colorIdx) => {
    const objectId = nextObjectId++;
    const partUuid = uuidv4();
    const amsExtruderNum = (amsIndices[colorIdx] ?? 0) + 1; // 1-based extruder (1, 2, 3, 4)
    const slot = amsSlots[amsExtruderNum - 1];
    const colorHex = slot ? slot.colorHex : (hexColors[colorIdx] || '#00AE42');
    const partName = `Part_${amsExtruderNum}_${colorHex.replace('#', '')}`;

    // Collect unique vertices used by this part to keep mesh clean
    const localVertexMap = new Map<number, number>();
    const localVertices: Vertex[] = [];

    faces.forEach(face => {
      face.vertices.forEach(vIdx => {
        if (!localVertexMap.has(vIdx)) {
          localVertexMap.set(vIdx, localVertices.length);
          localVertices.push(model.vertices[vIdx]);
        }
      });
    });

    // Generate vertex tags
    const verticesXml = localVertices
      .map(v => `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>`)
      .join('\n');

    // Generate triangle tags with both material index and paint_color attribute
    const paintColorAttr = PAINT_COLOR_MAP[amsExtruderNum - 1] || '1C';
    const trianglesXml = faces
      .map(face => {
        const v1 = localVertexMap.get(face.vertices[0]);
        const v2 = localVertexMap.get(face.vertices[1]);
        const v3 = localVertexMap.get(face.vertices[2]);
        return `<triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="2" p1="${colorIdx}" paint_color="${paintColorAttr}"/>`;
      })
      .join('\n');

    subObjectXmlParts.push(`
      <object id="${objectId}" name="${partName}" type="model" p:UUID="${partUuid}" pid="2" pindex="${colorIdx}">
        <mesh>
          <vertices>
            ${verticesXml}
          </vertices>
          <triangles>
            ${trianglesXml}
          </triangles>
        </mesh>
      </object>
    `);

    componentRefsXml.push(`<component objectid="${objectId}" p:UUID="${uuidv4()}"/>`);

    modelSettingsPartsXml.push(`
      <part id="${objectId}" subtype="normal_part">
        <metadata key="name" value="${partName}"/>
        <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
        <metadata key="source_file" value="${modelName}.scad"/>
        <metadata key="source_object_id" value="${objectId}"/>
        <metadata key="extruder" value="${amsExtruderNum}"/>
      </part>
    `);
  });

  // Base materials XML using effective colors
  const baseMaterialsXml = (amsSlots.length > 0 ? amsSlots.map(s => s.colorHex) : hexColors)
    .map((hex, i) => `<base name="Color_${i + 1}" displaycolor="${hex}"/>`)
    .join('\n');

  // Assembly Object XML (Object ID 1)
  const assemblyObjectXml = `
    <object id="1" name="${modelName}" type="model" p:UUID="${rootAssemblyUuid}">
      <components>
        ${componentRefsXml.join('\n')}
      </components>
    </object>
  `;

  // Complete 3D/3dmodel.model XML
  const model3dXml = `<?xml version="1.0" encoding="utf-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Application">MakerSCAD Studio</metadata>
  <metadata name="BambuStudio:3mfVersion">1</metadata>
  <metadata name="slic3rpe:Version3mf">1</metadata>
  <metadata name="slic3rpe:MmPaintingVersion">1</metadata>
  <metadata name="Title">${modelName}</metadata>
  <resources>
    <basematerials id="2">
      ${baseMaterialsXml}
    </basematerials>
    ${subObjectXmlParts.join('\n')}
    ${assemblyObjectXml}
  </resources>
  <build p:UUID="${buildUuid}">
    <item objectid="1" p:UUID="${rootAssemblyUuid}"/>
  </build>
</model>`;

  // 2. Metadata/model_settings.config (Crucial for Bambu Studio / OrcaSlicer part & extruder mapping!)
  const modelSettingsConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Plate 1"/>
    <metadata key="locked" value="false"/>
  </plate>
  <object id="1">
    <metadata key="name" value="${modelName}"/>
    <metadata key="extruder" value="1"/>
    ${modelSettingsPartsXml.join('\n')}
  </object>
</config>`;

  // 3. Metadata/project_settings.config (Filament definitions for AMS)
  const effectiveFilamentColors = amsSlots.length > 0
    ? amsSlots.map(s => s.colorHex)
    : hexColors.length > 0 ? hexColors : ['#00AE42'];
  const effectiveFilamentTypes = amsSlots.length > 0
    ? amsSlots.map(s => s.materialType)
    : hexColors.map(() => 'PLA');

  const projectSettingsConfig = JSON.stringify(
    {
      version: '1.8.0.0',
      project_name: modelName,
      filament_colour: effectiveFilamentColors,
      filament_type: effectiveFilamentTypes,
      process: {
        layer_height: '0.2',
        initial_layer_print_height: '0.2',
      },
    },
    null,
    2
  );

  // 4. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="text/plain"/>
</Types>`;

  // 5. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model" Id="rel0"/>
</Relationships>`;

  // Add files to ZIP
  zip.file('3D/3dmodel.model', model3dXml);
  zip.file('Metadata/model_settings.config', modelSettingsConfigXml);
  zip.file('Metadata/project_settings.config', projectSettingsConfig);
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'model/3mf',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Exports ASCII or Binary STL file
 */
export function exportStl(model: ParsedPolyhedron, binary: boolean = true): Blob {
  if (!binary) {
    let stl = 'solid OpenSCAD_Model\n';
    model.faces.forEach(face => {
      const v0 = model.vertices[face.vertices[0]];
      const v1 = model.vertices[face.vertices[1]];
      const v2 = model.vertices[face.vertices[2]];

      const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
      const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      stl += `  facet normal ${(nx / len).toFixed(6)} ${(ny / len).toFixed(6)} ${(nz / len).toFixed(6)}\n`;
      stl += '    outer loop\n';
      stl += `      vertex ${v0.x.toFixed(4)} ${v0.y.toFixed(4)} ${v0.z.toFixed(4)}\n`;
      stl += `      vertex ${v1.x.toFixed(4)} ${v1.y.toFixed(4)} ${v1.z.toFixed(4)}\n`;
      stl += `      vertex ${v2.x.toFixed(4)} ${v2.y.toFixed(4)} ${v2.z.toFixed(4)}\n`;
      stl += '    endloop\n';
      stl += '  endfacet\n';
    });
    stl += 'endsolid OpenSCAD_Model\n';
    return new Blob([stl], { type: 'text/plain' });
  }

  // Binary STL
  const bufferLength = 80 + 4 + model.faces.length * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 80-byte header
  const header = 'MakerSCAD Studio Binary STL';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // Number of triangles
  view.setUint32(80, model.faces.length, true);

  let offset = 84;
  model.faces.forEach(face => {
    const v0 = model.vertices[face.vertices[0]];
    const v1 = model.vertices[face.vertices[1]];
    const v2 = model.vertices[face.vertices[2]];

    const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
    const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    // Normal
    view.setFloat32(offset, nx / len, true);
    view.setFloat32(offset + 4, ny / len, true);
    view.setFloat32(offset + 8, nz / len, true);

    // V0
    view.setFloat32(offset + 12, v0.x, true);
    view.setFloat32(offset + 16, v0.y, true);
    view.setFloat32(offset + 20, v0.z, true);

    // V1
    view.setFloat32(offset + 24, v1.x, true);
    view.setFloat32(offset + 28, v1.y, true);
    view.setFloat32(offset + 32, v1.z, true);

    // V2
    view.setFloat32(offset + 36, v2.x, true);
    view.setFloat32(offset + 40, v2.y, true);
    view.setFloat32(offset + 44, v2.z, true);

    // Attribute byte count
    view.setUint16(offset + 48, 0, true);

    offset += 50;
  });

  return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Exports Wavefront OBJ with Material MTL
 */
export async function exportObj(model: ParsedPolyhedron, modelName: string = 'model'): Promise<Blob> {
  const zip = new JSZip();

  let obj = `# MakerSCAD Studio Wavefront OBJ\nmtllib ${modelName}.mtl\n`;
  model.vertices.forEach(v => {
    obj += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`;
  });

  const facesByColor = new Map<number, typeof model.faces>();
  model.faces.forEach(face => {
    const list = facesByColor.get(face.colorIndex) || [];
    list.push(face);
    facesByColor.set(face.colorIndex, list);
  });

  let mtl = `# Material Library\n`;

  facesByColor.forEach((faces, colorIdx) => {
    const matName = `material_${colorIdx}`;
    const color = model.colors[colorIdx] || [0.8, 0.8, 0.8, 1.0];
    mtl += `newmtl ${matName}\n`;
    mtl += `Kd ${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}\n`;
    mtl += `d ${color[3].toFixed(3)}\n\n`;

    obj += `g ${matName}\nusemtl ${matName}\n`;
    faces.forEach(face => {
      // 1-based indexing in OBJ
      obj += `f ${face.vertices[0] + 1} ${face.vertices[1] + 1} ${face.vertices[2] + 1}\n`;
    });
  });

  zip.file(`${modelName}.obj`, obj);
  zip.file(`${modelName}.mtl`, mtl);

  return await zip.generateAsync({ type: 'blob' });
}

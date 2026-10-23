import { ParameterSet, RenderResult, ScadParameter } from '../types';
import { parseOff } from './offParser';

let worker: Worker | null = null;
let messageId = 0;
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./openscadWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent) => {
      const { id, type, data, error } = e.data;
      const request = pendingRequests.get(id);
      if (!request) return;

      pendingRequests.delete(id);

      if (type === 'ERROR' || error) {
        request.reject(new Error(error || 'Worker error'));
      } else {
        request.resolve(data);
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
    };
  }
  return worker;
}

function sendWorkerMessage<T>(type: string, payload: Record<string, any>): Promise<T> {
  const id = ++messageId;
  const w = getWorker();

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    w.postMessage({ id, type, ...payload });
  });
}

/**
 * Robust parameter parser matching the official OpenSCAD Customizer specification
 * - Filters out derived expressions/formulas (e.g. a = b - c;) so they aren't corrupted by -D
 * - Supports /* [Tab Name] *\/ and /* [Hidden] *\/
 * - Supports range comments [min:step:max], enums [opt1, opt2], colors [Color]
 * - Calculates sensible step values for decimal numbers
 */
export function parseScadParametersRegex(code: string): ScadParameter[] {
  const params: ScadParameter[] = [];
  const lines = code.split('\n');

  let currentGroup = 'Parameters';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Customizer parameters only exist before module or function definitions
    if (/^\s*(module|function)\s+[a-zA-Z0-9_]+\s*\(/.test(line)) {
      break;
    }

    // Group / Tab header: /* [Group Name] */ or // [Group Name]
    const groupMatch = line.match(/^\/\*\s*\[(.*?)\]\s*\*\/$/) || line.match(/^\/\/\s*\[(.*?)\]$/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      continue;
    }

    // Skip variables in [Hidden] tab
    if (currentGroup.toLowerCase() === 'hidden') {
      continue;
    }

    // Assignment with inline comment: var_name = value; // [comment]
    // or simple: var_name = value;
    const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);(?:\s*\/\/\s*(.*))?$/);
    if (!assignMatch) continue;

    const name = assignMatch[1].trim();
    const rawVal = assignMatch[2].trim();
    const comment = (assignMatch[3] || '').trim();

    // Ignore OpenSCAD special variables ($fn, $fa, etc.) or private variables (_var)
    if (name.startsWith('$') || name.startsWith('_')) continue;

    // Check value literal types
    const isNumLiteral = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(rawVal);
    const isBoolLiteral = rawVal === 'true' || rawVal === 'false';
    const isStrLiteral = /^"([^"\\]|\\.)*"$/.test(rawVal);
    const isVecLiteral = /^\[\s*-?(?:0|[1-9]\d*)(?:\.\d+)?(?:\s*,\s*-?(?:0|[1-9]\d*)(?:\.\d+)?)*\s*\]$/.test(rawVal);

    // Check customizer comment annotations
    const rangeMatch = comment.match(/^\[([0-9.-]+):(?:([0-9.-]+):)?([0-9.-]+)\]$/);
    const isEnumComment = comment.startsWith('[') && comment.endsWith(']') && !rangeMatch && !comment.toLowerCase().includes('hidden');
    const isColorComment = comment.toLowerCase().includes('[color]');

    // CRITICAL: If rawVal is NOT a literal value and has NO customizer annotation,
    // it is a derived calculation / formula (e.g. kabartma_h = toplam_kalinlik - zemin_kalinlik;)
    // Overriding expressions via -D corrupts the math with string literals!
    if (!isNumLiteral && !isBoolLiteral && !isStrLiteral && !isVecLiteral && !rangeMatch && !isEnumComment && !isColorComment) {
      continue;
    }

    // Determine type, initial value, min, max, step
    let type: ScadParameter['type'] = 'string';
    let initial: any = rawVal;
    let min: number | undefined;
    let max: number | undefined;
    let step: number | undefined;
    let options: ScadParameter['options'] = undefined;

    if (rangeMatch) {
      type = 'number';
      initial = parseFloat(rawVal) || 0;
      min = parseFloat(rangeMatch[1]);
      if (rangeMatch[2] !== undefined) {
        step = parseFloat(rangeMatch[2]);
        max = parseFloat(rangeMatch[3]);
      } else {
        const decimals = rawVal.includes('.') ? (rawVal.split('.')[1] || '').length : 0;
        step = decimals === 0 ? 1 : Math.pow(10, -decimals);
        max = parseFloat(rangeMatch[1]); // e.g. [10:100] min: 10, max: 100
      }
    } else if (isEnumComment) {
      type = 'enum';
      const items = comment
        .substring(1, comment.length - 1)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      options = items.map(item => {
        const colonIdx = item.indexOf(':');
        if (colonIdx > 0) {
          const val = item.substring(0, colonIdx).trim();
          const label = item.substring(colonIdx + 1).trim();
          return { name: label, value: isNaN(Number(val)) ? val.replace(/^["']|["']$/g, '') : Number(val) };
        }
        const cleaned = item.replace(/^["']|["']$/g, '');
        return { name: cleaned, value: isNaN(Number(cleaned)) ? cleaned : Number(cleaned) };
      });

      if (isStrLiteral) {
        initial = rawVal.substring(1, rawVal.length - 1);
      } else if (isNumLiteral) {
        initial = Number(rawVal);
      }
    } else if (isColorComment || (isStrLiteral && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawVal.substring(1, rawVal.length - 1)))) {
      type = 'color';
      initial = isStrLiteral ? rawVal.substring(1, rawVal.length - 1) : rawVal;
    } else if (isBoolLiteral) {
      type = 'boolean';
      initial = rawVal === 'true';
    } else if (isNumLiteral) {
      type = 'number';
      initial = parseFloat(rawVal);
      const decimals = rawVal.includes('.') ? (rawVal.split('.')[1] || '').length : 0;
      step = decimals === 0 ? 1 : Math.pow(10, -decimals);
      min = 0;
      max = Math.max(100, Math.ceil(initial * 2));
    } else if (isStrLiteral) {
      type = 'string';
      initial = rawVal.substring(1, rawVal.length - 1);
    } else if (isVecLiteral) {
      type = 'vector';
      try {
        initial = JSON.parse(rawVal);
      } catch (_) {
        initial = rawVal;
      }
    }

    params.push({
      name,
      type,
      group: currentGroup,
      initial,
      min,
      max,
      step,
      options,
      description: comment,
    });
  }

  return params;
}

export function extractParameters(code: string): ParameterSet {
  const params = parseScadParametersRegex(code);
  return { parameters: params };
}

export async function renderModel(
  code: string,
  vars: Record<string, any>,
  customFonts?: { name: string; data: ArrayBuffer }[]
): Promise<RenderResult> {
  const result = await sendWorkerMessage<{
    rawOff: string;
    stdout: string;
    stderr: string;
    elapsedMs: number;
  }>('RENDER', { code, vars, customFonts });

  let polyhedron = null;
  if (result.rawOff) {
    try {
      polyhedron = parseOff(result.rawOff);
    } catch (e: any) {
      console.error('Failed to parse OFF geometry:', e);
    }
  }

  return {
    polyhedron,
    rawOff: result.rawOff,
    stdout: result.stdout,
    stderr: result.stderr,
    elapsedMs: result.elapsedMs,
  };
}

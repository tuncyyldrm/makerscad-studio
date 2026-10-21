/// <reference lib="webworker" />
import OpenSCAD from '../wasm/openscad.js';

let cachedWasmBinary: ArrayBuffer | null = null;

const BUNDLED_FONTS = [
  'font.ttf',
  'arialbd.ttf',
  'segoesc.ttf',
  'segoescb.ttf',
  'segoepr.ttf',
  'segoeprb.ttf',
  'impact.ttf',
  'tahoma.ttf',
];

const fontCache = new Map<string, ArrayBuffer>();

async function getWasmBinary(): Promise<ArrayBuffer> {
  if (cachedWasmBinary) return cachedWasmBinary;
  const res = await fetch('/wasm/openscad.wasm');
  if (!res.ok) {
    throw new Error(`Failed to load openscad.wasm: ${res.status} ${res.statusText}`);
  }
  cachedWasmBinary = await res.arrayBuffer();
  return cachedWasmBinary;
}

async function getBundledFontMap(): Promise<Map<string, ArrayBuffer>> {
  if (fontCache.size === BUNDLED_FONTS.length) return fontCache;

  await Promise.all(
    BUNDLED_FONTS.map(async name => {
      if (fontCache.has(name)) return;
      try {
        const res = await fetch(`/fonts/${name}`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          fontCache.set(name, buf);
        }
      } catch (err) {
        console.warn(`Font fetch error for ${name}:`, err);
      }
    })
  );

  return fontCache;
}

const FONTS_CONF = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>/fonts</dir>
  <cachedir>/fonts/cache</cachedir>
</fontconfig>`;

function mountFonts(instance: any, fontMap: Map<string, ArrayBuffer>, customFonts?: { name: string; data: ArrayBuffer }[]) {
  try {
    instance.FS.mkdir('/fonts');
  } catch (_) {}

  // Mount bundled fonts
  for (const [name, buf] of fontMap.entries()) {
    try {
      instance.FS.writeFile(`/fonts/${name}`, new Uint8Array(buf));
    } catch (_) {}
  }

  // Mount user uploaded custom fonts
  if (customFonts && Array.isArray(customFonts)) {
    for (const cf of customFonts) {
      try {
        instance.FS.writeFile(`/fonts/${cf.name}`, new Uint8Array(cf.data));
      } catch (_) {}
    }
  }

  try {
    instance.FS.writeFile('/fonts/fonts.conf', FONTS_CONF);
  } catch (_) {}
}

function formatVarValue(val: any): string {
  if (typeof val === 'number') {
    return isFinite(val) ? String(val) : '0';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (typeof val === 'string') {
    return `"${val.replace(/"/g, '\\"')}"`;
  }
  if (Array.isArray(val)) {
    return `[${val.map(formatVarValue).join(',')}]`;
  }
  return String(val);
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, code, vars, customFonts } = e.data;

  try {
    const wasmBinary = await getWasmBinary();
    const fontMap = await getBundledFontMap();

    if (type === 'INIT') {
      self.postMessage({ id, type: 'INIT_SUCCESS' });
      return;
    }

    if (type === 'EXTRACT_PARAMS') {
      let stdoutLogs = '';
      let stderrLogs = '';

      const instance = await OpenSCAD({
        noInitialRun: true,
        wasmBinary,
        ENV: {
          FONTCONFIG_PATH: '/fonts',
          FONTCONFIG_FILE: '/fonts/fonts.conf',
        },
        print: (text: string) => {
          stdoutLogs += text + '\n';
        },
        printErr: (text: string) => {
          stderrLogs += text + '\n';
        },
      });

      mountFonts(instance, fontMap, customFonts);

      instance.FS.writeFile('/param_input.scad', code);
      try {
        instance.callMain(['/param_input.scad', '-o', '/params.json', '--export-format=param']);
        const paramsJson = new TextDecoder('utf-8').decode(instance.FS.readFile('/params.json'));
        const parsed = JSON.parse(paramsJson);
        self.postMessage({ id, type: 'EXTRACT_PARAMS_SUCCESS', data: parsed });
      } catch (err: any) {
        self.postMessage({ id, type: 'EXTRACT_PARAMS_SUCCESS', data: { parameters: [] } });
      }
      return;
    }

    if (type === 'RENDER') {
      const startTime = performance.now();
      let stdoutLogs = '';
      let stderrLogs = '';

      const instance = await OpenSCAD({
        noInitialRun: true,
        wasmBinary,
        ENV: {
          FONTCONFIG_PATH: '/fonts',
          FONTCONFIG_FILE: '/fonts/fonts.conf',
        },
        print: (text: string) => {
          stdoutLogs += text + '\n';
        },
        printErr: (text: string) => {
          stderrLogs += text + '\n';
        },
      });

      mountFonts(instance, fontMap, customFonts);

      instance.FS.writeFile('/render_input.scad', code);

      // Prepare variable overrides (-D var=val)
      const varArgs: string[] = [];
      if (vars && typeof vars === 'object') {
        Object.entries(vars).forEach(([k, v]) => {
          if (v !== undefined && v !== null && !k.startsWith('$') && !k.startsWith('_')) {
            varArgs.push(`-D${k}=${formatVarValue(v)}`);
          }
        });
      }

      // Execute OpenSCAD with manifold backend and lazy union for colors
      const args = [
        '/render_input.scad',
        '-o',
        '/output.off',
        '--backend=manifold',
        '--enable=lazy-union',
        ...varArgs,
      ];

      instance.callMain(args);

      let offContent = '';
      try {
        offContent = new TextDecoder('utf-8').decode(instance.FS.readFile('/output.off'));
      } catch (e: any) {
        throw new Error(`Compilation output empty. ${stderrLogs || e.message}`);
      }

      const elapsedMs = performance.now() - startTime;

      self.postMessage({
        id,
        type: 'RENDER_SUCCESS',
        data: {
          rawOff: offContent,
          stdout: stdoutLogs,
          stderr: stderrLogs,
          elapsedMs,
        },
      });
      return;
    }
  } catch (error: any) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: error?.message || String(error),
    });
  }
};

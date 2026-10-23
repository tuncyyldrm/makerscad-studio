import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParameterSet, ParsedPolyhedron, AmsSlot, CustomFont } from './types';
import { PRESETS, Preset } from './data/presets';
import { extractParameters, renderModel } from './services/openscadService';
import { generateMakerWorld3mf, exportStl, exportObj } from './services/export3mf';
import { TopNavbar } from './components/TopNavbar';
import { CustomizerPanel } from './components/CustomizerPanel';
import { EditorPanel } from './components/EditorPanel';
import { Viewport3D } from './components/Viewport3D';
import { AmsPaletteManager } from './components/AmsPaletteManager';
import { FontManagerModal } from './components/FontManagerModal';
import { ModelInspectorPanel } from './components/ModelInspectorPanel';
import {
  import3dModelFile,
  ImportedModel,
  filterModelByPlate,
  buildArrangedPolyhedron,
} from './services/modelImportService';
import { UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPreset, setCurrentPreset] = useState<Preset>(PRESETS[0]);
  const [code, setCode] = useState<string>(PRESETS[0].code);
  const [parameterSet, setParameterSet] = useState<ParameterSet>({ parameters: [] });
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
  const [amsSlots, setAmsSlots] = useState<AmsSlot[]>(PRESETS[0].suggestedAmsSlots);

  const [model, setModel] = useState<ParsedPolyhedron | null>(null);
  const [rendering, setRendering] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [error, setError] = useState<string | undefined>();
  const [exporting, setExporting] = useState<boolean>(false);

  // Imported 3D Model State (.stl, .obj, .3mf, .glb)
  const [importedModel, setImportedModel] = useState<ImportedModel | null>(null);

  // Font state and modal
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [fontModalOpen, setFontModalOpen] = useState<boolean>(false);
  const customFontsRef = useRef<CustomFont[]>([]);

  // Default to Split View so users immediately see Code + Parameters + 3D Preview
  const [viewMode, setViewMode] = useState<'customizer' | 'editor' | 'split'>('split');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const renderTimeoutRef = useRef<number | null>(null);

  // Extract parameters whenever code changes (instant synchronous parsing)
  useEffect(() => {
    const params = extractParameters(code);
    setParameterSet(params);

    // Initialize parameter values only for currently valid parameters (prunes stale/derived vars)
    setParameterValues(prev => {
      const next: Record<string, any> = {};
      params.parameters.forEach(p => {
        next[p.name] = prev[p.name] !== undefined ? prev[p.name] : p.initial;
      });
      return next;
    });
  }, [code]);

  // Execute render
  const executeRender = useCallback(
    async (
      codeToRender: string,
      varsToPass: Record<string, any>,
      overrideFonts?: CustomFont[]
    ) => {
      setRendering(true);
      setError(undefined);

      try {
        const fontsToUse = overrideFonts ?? customFontsRef.current;
        const res = await renderModel(codeToRender, varsToPass, fontsToUse);
        setElapsedMs(res.elapsedMs);
        if (res.polyhedron) {
          setModel(res.polyhedron);
          // If in OpenSCAD mode (no imported 3D file active), auto-sync AMS slots to the model's detected colors
          if (res.polyhedron.colors.length > 0) {
            setAmsSlots(prev => {
              return prev.map((slot, idx) => {
                const c = res.polyhedron!.colors[idx];
                if (!c) return slot;
                const r = Math.round(c[0] * 255);
                const g = Math.round(c[1] * 255);
                const b = Math.round(c[2] * 255);
                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
                return {
                  ...slot,
                  colorHex: hex,
                };
              });
            });
          }
        } else {
          setError(res.stderr || 'No 3D geometry produced');
        }
        if (res.stderr && res.stderr.toLowerCase().includes('syntax error')) {
          setError(res.stderr);
        }
      } catch (err: any) {
        console.error('Render failure:', err);
        setError(err?.message || 'Geometry compilation failed');
      } finally {
        setRendering(false);
      }
    },
    []
  );

  // Add custom user uploaded font
  const handleAddCustomFont = (newFont: CustomFont) => {
    setCustomFonts(prev => {
      const updated = [...prev.filter(f => f.name !== newFont.name), newFont];
      customFontsRef.current = updated;
      executeRender(code, parameterValues, updated);
      return updated;
    });
  };

  // Quick font selection for current model
  const handleSelectFontForCode = (fontName: string) => {
    const fontParam = parameterSet.parameters.find(
      p => p.name.toLowerCase().includes('font') || p.name.toLowerCase().includes('yazi')
    );

    let updatedCode = code;
    const updatedValues = { ...parameterValues };

    if (fontParam) {
      updatedValues[fontParam.name] = fontName;
      const regex = new RegExp(`(${fontParam.name}\\s*=\\s*")[^"]*(";?)`, 'g');
      if (regex.test(updatedCode)) {
        updatedCode = updatedCode.replace(regex, `$1${fontName}$2`);
      }
    } else {
      const genericRegex = /(font(?:_adi|_name)?\s*=\s*")[^"]*(";?)/i;
      if (genericRegex.test(updatedCode)) {
        updatedCode = updatedCode.replace(genericRegex, `$1${fontName}$2`);
      } else {
        updatedCode = `/* [Font Settings] */\nfont_adi = "${fontName}";\n\n` + updatedCode;
        updatedValues['font_adi'] = fontName;
      }
    }

    setCode(updatedCode);
    setParameterValues(updatedValues);
    executeRender(updatedCode, updatedValues);
  };

  // Trigger debounced render when parameterValues change
  const handleParameterChange = (name: string, val: any) => {
    const updated = { ...parameterValues, [name]: val };
    setParameterValues(updated);

    // If a color parameter changed, also sync to matching AMS slot
    const colorParams = parameterSet.parameters.filter(
      p =>
        p.name.toLowerCase().includes('color') ||
        p.name.toLowerCase().includes('colour') ||
        (typeof p.initial === 'string' && p.initial.startsWith('#'))
    );
    const colorIdx = colorParams.findIndex(p => p.name === name);
    if (colorIdx >= 0 && typeof val === 'string' && val.startsWith('#')) {
      setAmsSlots(prev =>
        prev.map((slot, i) => (i === colorIdx ? { ...slot, colorHex: val.toUpperCase() } : slot))
      );
    }

    if (renderTimeoutRef.current) {
      window.clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = window.setTimeout(() => {
      executeRender(code, updated);
    }, 250);
  };

  // Switch Preset
  const handleSelectPreset = (preset: Preset) => {
    setImportedModel(null);
    setCurrentPreset(preset);
    setCode(preset.code);
    setParameterValues({});
    setAmsSlots(preset.suggestedAmsSlots);
    executeRender(preset.code, {});
  };

  // Load completely new code from outside (paste, file upload, drag-and-drop)
  const handleLoadNewCode = (newCode: string, filename?: string) => {
    setImportedModel(null);
    if (filename) {
      setCurrentPreset({
        id: 'custom-' + Date.now(),
        name: filename.replace(/\.scad$/i, ''),
        category: 'Custom',
        description: 'Loaded from ' + filename,
        colorsCount: 2,
        code: newCode,
        suggestedAmsSlots: amsSlots,
      });
    }

    setCode(newCode);
    // Clear out old preset variables so they don't corrupt the new model
    setParameterValues({});
    executeRender(newCode, {});
  };

  // Handle incoming 3D or code file (SCAD, STL, OBJ, 3MF, GLB)
  const handleIncomingFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'scad' || ext === 'txt' || file.type.includes('text')) {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string;
        if (content) {
          handleLoadNewCode(content, file.name);
        }
      };
      reader.readAsText(file);
    } else if (['stl', 'obj', '3mf', 'glb', 'gltf'].includes(ext || '')) {
      setRendering(true);
      setError(undefined);

      try {
        const imported = await import3dModelFile(file);
        setImportedModel(imported);
        setModel(imported.polyhedron);

        setCurrentPreset({
          id: 'imported-' + Date.now(),
          name: imported.name,
          category: `Imported ${imported.format.toUpperCase()}`,
          description: `${imported.format.toUpperCase()} 3D model (${imported.partsCount} parts, ${imported.triangleCount.toLocaleString()} triangles)`,
          colorsCount: imported.polyhedron.colors.length,
          code: `// =======================================================\n// İÇE AKTARILAN 3D MODEL: ${file.name}\n// Format: ${imported.format.toUpperCase()}\n// Üçgen Sayısı: ${imported.triangleCount.toLocaleString()}\n// =======================================================\n`,
          suggestedAmsSlots: amsSlots,
        });

        // Auto match AMS slots to detected colors
        if (imported.detectedColors.length > 0) {
          setAmsSlots(prev =>
            prev.map((slot, i) => {
              const c = imported.detectedColors[i];
              return c ? { ...slot, colorHex: c } : slot;
            })
          );
        }
      } catch (err: any) {
        console.error('3D Import error:', err);
        setError(err.message || '3D Dosyası yüklenemedi');
        alert('3D Dosyası yüklenemedi: ' + err.message);
      } finally {
        setRendering(false);
      }
    } else {
      alert(`Desteklenmeyen dosya: ${file.name}. Lütfen .scad, .stl, .obj, .3mf veya .glb dosyası seçin.`);
    }
  };

  // Scale imported 3D model
  const handleScaleImportedModel = (factor: number) => {
    if (!importedModel) return;
    const updatedPoly: ParsedPolyhedron = {
      ...importedModel.polyhedron,
      vertices: importedModel.polyhedron.vertices.map(v => ({
        x: v.x * factor,
        y: v.y * factor,
        z: v.z * factor,
      })),
      bounds: {
        min: {
          x: importedModel.polyhedron.bounds.min.x * factor,
          y: importedModel.polyhedron.bounds.min.y * factor,
          z: importedModel.polyhedron.bounds.min.z * factor,
        },
        max: {
          x: importedModel.polyhedron.bounds.max.x * factor,
          y: importedModel.polyhedron.bounds.max.y * factor,
          z: importedModel.polyhedron.bounds.max.z * factor,
        },
        size: {
          x: importedModel.polyhedron.bounds.size.x * factor,
          y: importedModel.polyhedron.bounds.size.y * factor,
          z: importedModel.polyhedron.bounds.size.z * factor,
        },
      },
    };
    setImportedModel({
      ...importedModel,
      polyhedron: updatedPoly,
    });
    setModel(updatedPoly);
  };

  // Switch Plate (for Bambu Studio 3MF files with multiple plates)
  const handleSwitchPlate = (plateId: number | 'all') => {
    if (!importedModel) return;
    const updated = filterModelByPlate(importedModel, plateId, importedModel.layoutMode);
    setImportedModel(updated);
    setModel(updated.polyhedron);
  };

  // Switch Layout Mode (Slicer Arranged vs CAD Assembled)
  const handleSwitchLayoutMode = (mode: 'arranged' | 'assembled') => {
    if (!importedModel) return;
    const updated = filterModelByPlate(importedModel, importedModel.activePlateId, mode);
    setImportedModel(updated);
    setModel(updated.polyhedron);
  };

  // Auto-Arrange Plate (Tablaya Otomatik Diz)
  const handleAutoArrangeModel = () => {
    if (!importedModel) return;
    const filteredParts = importedModel.activePlateId === 'all'
      ? importedModel.parts
      : importedModel.parts.filter(p => p.plateId === importedModel.activePlateId);
    const partsToPack = filteredParts.length > 0 ? filteredParts : importedModel.parts;
    const arranged = buildArrangedPolyhedron(partsToPack, 12);
    setImportedModel({
      ...importedModel,
      layoutMode: 'arranged',
      polyhedron: arranged,
    });
    setModel(arranged);
  };

  // Convert imported 3D model to OpenSCAD script for hybrid customization
  const handleConvertToScad = () => {
    if (!importedModel) return;
    const newCode = `// =======================================================
// MAKERWORLD STUDIO - HİBRİT TASARIM
// Model: ${importedModel.filename} (${importedModel.triangleCount.toLocaleString()} Üçgen)
// =======================================================

/* [Metin & Kabartma Ayarları] */
yazi_metni = "MAKER";
yazi_fontu = "Segoe Script:style=Bold";
yazi_boyutu = 8.0; // [4:1:20]
yazi_kalinligi = 1.2; // [0.4:0.2:3]

/* [Renkler (AMS Filament)] */
model_rengi = "${importedModel.detectedColors[0] || '#00AE42'}"; // [Color]
yazi_rengi  = "#FFFFFF"; // [Color]

// 1. Ana 3D Model (${importedModel.format.toUpperCase()})
color(model_rengi) {
    import("${importedModel.filename}");
}

// 2. Modelin Üzerine Eklenen Kabartma Yazı
color(yazi_rengi) {
    translate([0, 0, ${Math.max(1, Math.ceil(importedModel.polyhedron.bounds.size.z))}]) {
        linear_extrude(height = yazi_kalinligi) {
            text(yazi_metni, font = yazi_fontu, size = yazi_boyutu, halign = "center", valign = "center");
        }
    }
}
`;
    setImportedModel(null);
    handleLoadNewCode(newCode, importedModel.name);
  };

  // Reset all parameters
  const handleResetAll = () => {
    const defaults: Record<string, any> = {};
    parameterSet.parameters.forEach(p => {
      defaults[p.name] = p.initial;
    });
    setParameterValues(defaults);
    executeRender(code, defaults);
  };

  // Update Code directly from Editor typing
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    if (renderTimeoutRef.current) {
      window.clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = window.setTimeout(() => {
      executeRender(newCode, parameterValues);
    }, 500);
  };

  // Initial render on mount
  useEffect(() => {
    executeRender(code, parameterValues);
  }, []);

  // Handle Global F5 Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        executeRender(code, parameterValues);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, parameterValues, executeRender]);

  // Global Drag & Drop Handler for .scad files
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleIncomingFile(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [amsSlots]);

  // Handle Upload via Navbar file picker
  const handleUploadFile = (file: File) => {
    handleIncomingFile(file);
  };

  // Update single AMS Slot
  const handleUpdateSlot = (slotId: number, colorHex: string, materialType: string) => {
    setAmsSlots(prev =>
      prev.map(s => (s.id === slotId ? { ...s, colorHex, materialType } : s))
    );

    // Also check if there is a corresponding color parameter in the customizer
    const colorParams = parameterSet.parameters.filter(
      p =>
        p.type === 'color' ||
        p.name.toLowerCase().includes('color') ||
        p.name.toLowerCase().includes('colour') ||
        p.name.toLowerCase().includes('renk') ||
        (typeof p.initial === 'string' && p.initial.startsWith('#'))
    );
    const matchingParam = colorParams[slotId - 1];
    if (matchingParam) {
      const updated = { ...parameterValues, [matchingParam.name]: colorHex };
      setParameterValues(updated);
      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current);
      }
      renderTimeoutRef.current = window.setTimeout(() => {
        executeRender(code, updated);
      }, 250);
    }
  };

  // Auto-Match AMS slots from model colors
  const handleAutoMatch = () => {
    if (!model || model.colors.length === 0) return;

    setAmsSlots(prev => {
      return prev.map((slot, idx) => {
        const color = model.colors[idx];
        if (!color) return slot;
        const r = Math.round(color[0] * 255);
        const g = Math.round(color[1] * 255);
        const b = Math.round(color[2] * 255);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        return {
          ...slot,
          colorHex: hex,
        };
      });
    });
  };

  // Download Helper
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Bambu / MakerWorld 3MF
  const handleExport3mf = async () => {
    if (!model) return;
    setExporting(true);
    try {
      const sanitizedName = currentPreset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const blob = await generateMakerWorld3mf(model, sanitizedName, amsSlots);
      triggerDownload(blob, `${sanitizedName}_multicolor.3mf`);
    } catch (e: any) {
      console.error('Export 3MF failed:', e);
      alert('Failed to generate 3MF file: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // Export STL
  const handleExportStl = () => {
    if (!model) return;
    const sanitizedName = currentPreset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = exportStl(model, true);
    triggerDownload(blob, `${sanitizedName}.stl`);
  };

  // Export OBJ
  const handleExportObj = async () => {
    if (!model) return;
    const sanitizedName = currentPreset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = await exportObj(model, sanitizedName);
    triggerDownload(blob, `${sanitizedName}_obj.zip`);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#121214] text-neutral-200 overflow-hidden font-sans relative">
      {/* Drag & Drop File Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-bambu-green/90 backdrop-blur-md z-50 flex flex-col items-center justify-center border-4 border-dashed border-white text-black pointer-events-none animate-in fade-in">
          <UploadCloud size={64} className="animate-bounce mb-3" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Drop 3D File Here</h2>
          <p className="text-sm font-medium opacity-80 mt-1">
            Supports .scad, .stl, .obj, .3mf, .glb / .gltf
          </p>
        </div>
      )}

      {/* Top Navbar */}
      <TopNavbar
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onRender={() => executeRender(code, parameterValues)}
        rendering={rendering}
        onExport3mf={handleExport3mf}
        onExportStl={handleExportStl}
        onExportObj={handleExportObj}
        exporting={exporting}
        onUploadFile={handleUploadFile}
        onOpenFontManager={() => setFontModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Customizer Panel OR Model Inspector Panel (for imported 3D models) */}
        {importedModel ? (
          <div className={`${viewMode === 'split' ? 'w-80' : 'w-96'} h-full shrink-0`}>
            <ModelInspectorPanel
              importedModel={importedModel}
              amsSlots={amsSlots}
              onUpdateSlotColor={(slotId, hex) => handleUpdateSlot(slotId, hex, 'PLA')}
              onScaleModel={handleScaleImportedModel}
              onConvertToScad={handleConvertToScad}
              onExport3mf={handleExport3mf}
              onSwitchPlate={handleSwitchPlate}
              onSwitchLayoutMode={handleSwitchLayoutMode}
              onAutoArrangeModel={handleAutoArrangeModel}
            />
          </div>
        ) : (viewMode === 'customizer' || viewMode === 'split') ? (
          <div className={`${viewMode === 'split' ? 'w-80' : 'w-96'} h-full shrink-0`}>
            <CustomizerPanel
              parameterSet={parameterSet}
              values={parameterValues}
              onChange={handleParameterChange}
              onResetAll={handleResetAll}
              onOpenFontManager={() => setFontModalOpen(true)}
            />
          </div>
        ) : null}

        {/* Center: OpenSCAD Code Editor */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-[480px]' : 'w-[620px]'} h-full shrink-0`}>
            <EditorPanel
              code={code}
              onChange={handleCodeChange}
              onLoadNewCode={handleLoadNewCode}
              error={error}
            />
          </div>
        )}

        {/* Right: 3D Viewport with Bottom AMS Bar */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#161619]">
          <div className="flex-1 w-full h-full relative">
            <Viewport3D
              model={model}
              amsSlots={amsSlots}
              rendering={rendering}
              elapsedMs={elapsedMs}
            />
          </div>

          {/* AMS Filament Manager Bar at bottom */}
          <AmsPaletteManager
            slots={amsSlots}
            modelColors={model ? model.colors : []}
            onUpdateSlot={handleUpdateSlot}
            onAutoMatch={handleAutoMatch}
          />
        </div>
      </div>

      {/* Font & Typography Manager Modal */}
      <FontManagerModal
        isOpen={fontModalOpen}
        onClose={() => setFontModalOpen(false)}
        customFonts={customFonts}
        onAddCustomFont={handleAddCustomFont}
        onSelectFontForCode={handleSelectFontForCode}
      />
    </div>
  );
};

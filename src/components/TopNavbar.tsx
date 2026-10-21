import React, { useState, useRef } from 'react';
import { Preset, PRESETS } from '../data/presets';
import {
  Download,
  Play,
  Layers,
  Code2,
  Sliders,
  ChevronDown,
  Printer,
  Sparkles,
  Upload,
  FileCode,
  FolderOpen,
  Type,
} from 'lucide-react';

interface TopNavbarProps {
  currentPreset: Preset;
  onSelectPreset: (preset: Preset) => void;
  viewMode: 'customizer' | 'editor' | 'split';
  onChangeViewMode: (mode: 'customizer' | 'editor' | 'split') => void;
  onRender: () => void;
  rendering: boolean;
  onExport3mf: () => void;
  onExportStl: () => void;
  onExportObj: () => void;
  exporting: boolean;
  onUploadFile: (file: File) => void;
  onOpenFontManager?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentPreset,
  onSelectPreset,
  viewMode,
  onChangeViewMode,
  onRender,
  rendering,
  onExport3mf,
  onExportStl,
  onExportObj,
  exporting,
  onUploadFile,
  onOpenFontManager,
}) => {
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    e.target.value = '';
  };

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-[#141416] border-b border-white/10 select-none z-30 shrink-0">
      {/* Hidden file input for open 3D formats */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".scad,.stl,.obj,.3mf,.glb,.gltf,.txt,.openscad"
        className="hidden"
      />

      {/* Left: Brand, Preset Selector & Open File Button */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-bambu-green to-emerald-400 flex items-center justify-center shadow-lg shadow-bambu-green/20">
            <Printer size={18} className="text-black font-black" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white">MakerSCAD</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-bambu-green/20 text-bambu-green border border-bambu-green/30">
                3MF
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Bambu & MakerWorld Studio</span>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="relative">
          <button
            onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#202025] hover:bg-[#28282e] border border-white/10 text-xs font-medium text-neutral-200 transition-colors shadow-sm"
          >
            <Sparkles size={14} className="text-bambu-green" />
            <span className="max-w-[130px] truncate">{currentPreset.name}</span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {presetDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-[#1f1f24] border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1.5">
                MakerWorld Templates
              </div>
              <div className="space-y-1">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset);
                      setPresetDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentPreset.id === preset.id
                        ? 'bg-bambu-green/15 text-bambu-green font-semibold'
                        : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{preset.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-400 font-mono">
                        {preset.colorsCount} Colors
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 truncate mt-0.5">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Open / Upload 3D File button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Open 3D File: .scad, .stl, .obj, .3mf, .glb (Bilgisayardan 3D Dosyası Aç)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors shadow-sm"
        >
          <FolderOpen size={14} className="text-amber-400" />
          <span>Open 3D File</span>
        </button>

        {/* Font Manager Modal Button */}
        {onOpenFontManager && (
          <button
            onClick={onOpenFontManager}
            title="Font & Yazı Tipleri Yöneticisi (Segoe Script, Arial, Impact, Özel Font Yükle)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors shadow-sm"
          >
            <Type size={14} className="text-pink-400" />
            <span>Fonts</span>
          </button>
        )}
      </div>

      {/* Center: View Layout Switcher */}
      <div className="flex items-center bg-[#202025] p-1 rounded-xl border border-white/10 text-xs">
        <button
          onClick={() => onChangeViewMode('split')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
            viewMode === 'split'
              ? 'bg-bambu-green text-black font-semibold shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers size={14} />
          <span>Split View</span>
        </button>

        <button
          onClick={() => onChangeViewMode('editor')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
            viewMode === 'editor'
              ? 'bg-bambu-green text-black font-semibold shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Code2 size={14} />
          <span>Code Editor</span>
        </button>

        <button
          onClick={() => onChangeViewMode('customizer')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
            viewMode === 'customizer'
              ? 'bg-bambu-green text-black font-semibold shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders size={14} />
          <span>Customizer</span>
        </button>
      </div>

      {/* Right: Actions & 3MF Export Button */}
      <div className="flex items-center gap-2.5">
        {/* Render Button */}
        <button
          onClick={onRender}
          disabled={rendering}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#202025] hover:bg-[#2a2a30] active:scale-95 text-neutral-200 border border-white/10 rounded-xl text-xs font-medium transition-all"
        >
          <Play size={13} className={`text-bambu-green ${rendering ? 'animate-spin' : ''}`} />
          <span>{rendering ? 'Rendering...' : 'Render'}</span>
          <kbd className="text-[10px] bg-black/40 px-1 py-0.5 rounded text-neutral-400 font-mono">F5</kbd>
        </button>

        {/* Big Bambu / MakerWorld Multi-Color 3MF Export Button */}
        <div className="relative">
          <div className="flex items-center rounded-xl bg-bambu-green hover:bg-bambu-green-dark text-black font-bold text-xs shadow-lg shadow-bambu-green/20 transition-all">
            <button
              onClick={onExport3mf}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 hover:opacity-90 active:scale-95"
            >
              <Download size={15} className="font-extrabold" />
              <span>{exporting ? 'Generating 3MF...' : 'Export Colored 3MF'}</span>
            </button>

            <div className="w-[1px] h-4 bg-black/20" />

            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="px-2 py-2 hover:bg-black/10 rounded-r-xl"
              title="More Export Options"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {exportDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1f1f24] border border-white/15 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">
                Print File Formats
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onExport3mf();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-bambu-green" />
                    <div>
                      <div className="font-semibold text-white">Bambu / Orca 3MF</div>
                      <div className="text-[10px] text-neutral-400">Multi-part + AMS slots mapped</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-bambu-green/20 text-bambu-green px-1.5 py-0.5 rounded font-bold">
                    RECOMMENDED
                  </span>
                </button>

                <button
                  onClick={() => {
                    onExportStl();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <FileCode size={14} className="text-neutral-400" />
                  <div>
                    <div className="font-medium text-white">Standard STL (.stl)</div>
                    <div className="text-[10px] text-neutral-400">Binary mesh file</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onExportObj();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Layers size={14} className="text-neutral-400" />
                  <div>
                    <div className="font-medium text-white">Wavefront OBJ (.obj + .mtl)</div>
                    <div className="text-[10px] text-neutral-400">Multi-material mesh archive</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

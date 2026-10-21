import React from 'react';
import { ImportedModel } from '../services/modelImportService';
import { AmsSlot } from '../types';
import {
  Box,
  Layers,
  Palette,
  Maximize2,
  Sparkles,
  Download,
  Code2,
  Grid,
  Info,
  CheckCircle2,
  LayoutGrid,
  Component,
} from 'lucide-react';

interface ModelInspectorPanelProps {
  importedModel: ImportedModel;
  amsSlots: AmsSlot[];
  onUpdateSlotColor: (slotId: number, colorHex: string) => void;
  onScaleModel: (factor: number) => void;
  onConvertToScad: () => void;
  onExport3mf: () => void;
  onSwitchPlate?: (plateId: number | 'all') => void;
  onSwitchLayoutMode?: (mode: 'arranged' | 'assembled') => void;
  onAutoArrangeModel?: () => void;
}

export const ModelInspectorPanel: React.FC<ModelInspectorPanelProps> = ({
  importedModel,
  amsSlots,
  onUpdateSlotColor,
  onScaleModel,
  onConvertToScad,
  onExport3mf,
  onSwitchPlate,
  onSwitchLayoutMode,
  onAutoArrangeModel,
}) => {
  const {
    polyhedron,
    format,
    name,
    triangleCount,
    partsCount,
    parts,
    plates,
    activePlateId,
    layoutMode,
    isOverlapping,
  } = importedModel;
  const bounds = polyhedron.bounds;

  const formatColors: Record<string, string> = {
    stl: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '3mf': 'bg-emerald-500/20 text-bambu-green border-emerald-500/30',
    obj: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glb: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] border-r border-white/10 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-bambu-green" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            3D Model Yöneticisi
          </h2>
        </div>

        <span
          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
            formatColors[format] || 'bg-white/10 text-white'
          }`}
        >
          {format.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Model Info Card */}
        <div className="bg-[#202025] rounded-xl border border-white/5 p-3.5 space-y-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={name}>
                {name}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {triangleCount.toLocaleString()} Üçgen • {partsCount} Parça {plates && plates.length > 0 ? `• ${plates.length} Tabla` : ''}
              </p>
            </div>
          </div>

          {/* Dimensions Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
              <span className="text-[10px] text-neutral-500 uppercase block font-bold">X (Genişlik)</span>
              <span className="text-xs font-mono font-bold text-neutral-200">
                {bounds.size.x.toFixed(1)} <span className="text-[9px] text-neutral-500">mm</span>
              </span>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
              <span className="text-[10px] text-neutral-500 uppercase block font-bold">Y (Derinlik)</span>
              <span className="text-xs font-mono font-bold text-neutral-200">
                {bounds.size.y.toFixed(1)} <span className="text-[9px] text-neutral-500">mm</span>
              </span>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center border border-white/5">
              <span className="text-[10px] text-neutral-500 uppercase block font-bold">Z (Yükseklik)</span>
              <span className="text-xs font-mono font-bold text-bambu-green">
                {bounds.size.z.toFixed(1)} <span className="text-[9px] text-neutral-500">mm</span>
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Plate Tabs (Bambu Studio / OrcaSlicer Plates) */}
        {plates && plates.length > 0 && onSwitchPlate && (
          <div className="bg-[#202025] rounded-xl border border-white/5 p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                <Layers size={14} className="text-bambu-green" />
                <span>Bambu Tabla Seçimi ({plates.length})</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => onSwitchPlate('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  activePlateId === 'all'
                    ? 'bg-bambu-green text-black border-bambu-green shadow-sm shadow-bambu-green/30'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Tüm Tablalar ({partsCount})
              </button>

              {plates.map(plate => {
                const isActive = activePlateId === plate.id;
                const platePartsCount = parts ? parts.filter(p => p.plateId === plate.id).length : plate.partIds.length;
                return (
                  <button
                    key={plate.id}
                    onClick={() => onSwitchPlate(plate.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isActive
                        ? 'bg-bambu-green text-black border-bambu-green shadow-sm shadow-bambu-green/30'
                        : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {plate.name} ({platePartsCount})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Layout Mode Toggle: Slicer Auto-Arranged vs CAD Assembly */}
        {partsCount > 1 && onSwitchLayoutMode && (
          <div className="bg-[#202025] rounded-xl border border-white/5 p-3.5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
                <LayoutGrid size={14} className="text-bambu-green" />
                <span>Görünüm & Dizilim Düzeni</span>
              </div>
            </div>

            {isOverlapping && (
              <div className="flex items-start gap-2 p-2 bg-bambu-green/10 border border-bambu-green/20 rounded-lg text-[11px] text-neutral-300 leading-snug">
                <CheckCircle2 size={14} className="text-bambu-green shrink-0 mt-0.5" />
                <span>
                  Modeller iç içe geçmeyecek şekilde Bambu tablasına otomatik dizildi.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onSwitchLayoutMode('arranged')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  layoutMode === 'arranged'
                    ? 'bg-bambu-green text-black border-bambu-green shadow-sm'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Grid size={13} />
                <span>Tablaya Dizili (Slicer)</span>
              </button>

              <button
                onClick={() => onSwitchLayoutMode('assembled')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  layoutMode === 'assembled'
                    ? 'bg-bambu-green text-black border-bambu-green shadow-sm'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Component size={13} />
                <span>Montaj / Birleşik</span>
              </button>
            </div>

            {onAutoArrangeModel && (
              <button
                onClick={onAutoArrangeModel}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-bold transition-all mt-1 active:scale-95"
              >
                <Grid size={13} className="text-bambu-green" />
                <span>Tablaya Otomatik Yeniden Diz (12 mm Aralık)</span>
              </button>
            )}
          </div>
        )}

        {/* AMS Multi-Color Part Mapping */}
        <div className="bg-[#202025] rounded-xl border border-white/5 p-3.5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
              <Palette size={14} className="text-bambu-green" />
              <span>AMS Renk & Parça Eşleme</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              {polyhedron.colors.length} Renk
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Modeldeki parçaların renklerini aşağıdaki AMS filament yuvaları ile değiştirebilirsiniz:
          </p>

          <div className="space-y-2 pt-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {polyhedron.colors.map((color, idx) => {
              const currentSlot = amsSlots[idx] || amsSlots[0];
              const slotHex = currentSlot.colorHex;
              const matchingPart = parts ? parts[idx] : undefined;
              const partDisplayName = matchingPart ? matchingPart.name : `Parça ${idx + 1}`;
              const plateName = matchingPart?.plateName ? ` (${matchingPart.plateName})` : '';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-5 h-5 rounded-md border border-white/30 shadow-inner shrink-0"
                      style={{ backgroundColor: slotHex }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate max-w-[170px]" title={partDisplayName + plateName}>
                        {partDisplayName}{plateName}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        AMS Yuva {idx + 1} ({currentSlot.name})
                      </span>
                    </div>
                  </div>

                  <input
                    type="color"
                    value={slotHex}
                    onChange={e => onUpdateSlotColor(idx + 1, e.target.value.toUpperCase())}
                    className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer bg-transparent shrink-0"
                    title="Bu parçanın rengini değiştir"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Scale Tools */}
        <div className="bg-[#202025] rounded-xl border border-white/5 p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <Maximize2 size={14} className="text-bambu-green" />
            <span>Hızlı Boyutlandırma (Ölçek)</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => onScaleModel(0.5)}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors"
            >
              %50
            </button>
            <button
              onClick={() => onScaleModel(0.75)}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors"
            >
              %75
            </button>
            <button
              onClick={() => onScaleModel(1.5)}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors"
            >
              %150
            </button>
            <button
              onClick={() => onScaleModel(2.0)}
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors"
            >
              %200
            </button>
          </div>
        </div>

        {/* Hybrid Mode: Convert to OpenSCAD Script */}
        <div className="bg-bambu-green/10 rounded-xl border border-bambu-green/20 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles size={14} className="text-bambu-green" />
            <span>Hibrit Tasarım (Yazı & Klips Ekle)</span>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Bu modeli OpenSCAD editörüne aktararak üzerine Segoe Script kabartma yazı veya ataş klipsi ekleyebilirsiniz.
          </p>

          <button
            onClick={onConvertToScad}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-bambu-green hover:bg-bambu-green-dark text-black text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Code2 size={14} />
            <span>OpenSCAD Editörüne Aktar</span>
          </button>
        </div>

        {/* Bambu 3MF Export Button */}
        <button
          onClick={onExport3mf}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bambu-green hover:bg-bambu-green-dark text-black text-xs font-extrabold transition-all shadow-lg shadow-bambu-green/20 active:scale-95"
        >
          <Download size={15} />
          <span>Bambu Lab 3MF Olarak İndir</span>
        </button>
      </div>
    </div>
  );
};

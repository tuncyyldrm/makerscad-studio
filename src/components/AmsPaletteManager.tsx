import React, { useState } from 'react';
import { AmsSlot, ColorRGBA } from '../types';
import { Palette, Disc3, Check, RefreshCw } from 'lucide-react';

interface AmsPaletteManagerProps {
  slots: AmsSlot[];
  modelColors: ColorRGBA[];
  onUpdateSlot: (slotId: number, colorHex: string, materialType: string) => void;
  onAutoMatch: () => void;
}

const BAMBU_PRESET_COLORS = [
  { name: 'Bambu Green', hex: '#00AE42' },
  { name: 'Jade White', hex: '#FFFFFF' },
  { name: 'Matte Charcoal', hex: '#2B2B2B' },
  { name: 'Fire Engine Red', hex: '#E74C3C' },
  { name: 'Mandarine Orange', hex: '#FF5C00' },
  { name: 'Sunflower Yellow', hex: '#F1C40F' },
  { name: 'Cobalt Blue', hex: '#2980B9' },
  { name: 'Cyan Blue', hex: '#00D2D3' },
  { name: 'Purple Violet', hex: '#8E44AD' },
  { name: 'Sakura Pink', hex: '#F7A8B8' },
  { name: 'Desert Tan', hex: '#D2B48C' },
  { name: 'Silver Silk', hex: '#BDC3C7' },
];

export const AmsPaletteManager: React.FC<AmsPaletteManagerProps> = ({
  slots,
  modelColors,
  onUpdateSlot,
  onAutoMatch,
}) => {
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1d] border-t border-white/10 text-xs">
      {/* Left: AMS Header & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-neutral-300 font-semibold uppercase tracking-wider">
          <Disc3 size={15} className="text-bambu-green animate-spin-slow" />
          <span>Bambu AMS Filaments</span>
        </div>

        <button
          onClick={onAutoMatch}
          title="Auto-match AMS slots to detected model colors"
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
        >
          <RefreshCw size={12} />
          Auto-Sync Colors
        </button>
      </div>

      {/* Center: 4 AMS Slots */}
      <div className="flex items-center gap-2">
        {slots.map(slot => {
          const isSelected = activeSlotId === slot.id;

          return (
            <div key={slot.id} className="relative">
              <button
                onClick={() => setActiveSlotId(isSelected ? null : slot.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-bambu-green bg-white/10 shadow-lg'
                    : 'border-white/10 bg-[#242429] hover:bg-white/5'
                }`}
              >
                {/* Filament Color Circle with Native Color Picker */}
                <label
                  className="relative cursor-pointer"
                  title={`Click to pick color for Slot ${slot.id}`}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="color"
                    value={slot.colorHex}
                    onChange={e => onUpdateSlot(slot.id, e.target.value.toUpperCase(), slot.materialType)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-black/40 shadow-inner flex items-center justify-center text-[9px] font-bold hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: slot.colorHex,
                      color: ['#FFFFFF', '#F7A8B8', '#F1C40F'].includes(slot.colorHex.toUpperCase())
                        ? '#000000'
                        : '#FFFFFF',
                    }}
                  >
                    {slot.id}
                  </div>
                </label>

                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-neutral-200 leading-tight">
                    Slot {slot.id}
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    {slot.materialType} {slot.colorHex}
                  </span>
                </div>
              </button>

              {/* Color Picker Flyout */}
              {isSelected && (
                <div className="absolute bottom-full mb-2 left-0 w-64 p-3 bg-[#232328] border border-white/15 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-semibold text-neutral-200 mb-2 flex items-center justify-between">
                    <span>AMS Slot {slot.id} Color</span>
                    <input
                      type="color"
                      value={slot.colorHex}
                      onChange={e => onUpdateSlot(slot.id, e.target.value.toUpperCase(), slot.materialType)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>

                  {/* Preset Swatches */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {BAMBU_PRESET_COLORS.map(p => (
                      <button
                        key={p.hex}
                        onClick={() => {
                          onUpdateSlot(slot.id, p.hex, slot.materialType);
                          setActiveSlotId(null);
                        }}
                        title={p.name}
                        className="group flex flex-col items-center p-1 rounded-md hover:bg-white/10 transition-colors"
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-white/20 shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: p.hex }}
                        >
                          {slot.colorHex.toUpperCase() === p.hex.toUpperCase() && (
                            <Check
                              size={12}
                              className={
                                ['#FFFFFF', '#F7A8B8', '#F1C40F'].includes(p.hex)
                                  ? 'text-black font-bold'
                                  : 'text-white font-bold'
                              }
                            />
                          )}
                        </div>
                        <span className="text-[8px] text-neutral-400 truncate w-full text-center mt-0.5">
                          {p.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Material Type Selector */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                    <span className="text-[10px] text-neutral-400">Filament:</span>
                    {['PLA', 'PETG', 'ABS', 'TPU'].map(mat => (
                      <button
                        key={mat}
                        onClick={() => onUpdateSlot(slot.id, slot.colorHex, mat)}
                        className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                          slot.materialType === mat
                            ? 'bg-bambu-green text-black font-semibold'
                            : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Detected Model Colors Summary */}
      <div className="flex items-center gap-1.5 text-neutral-400">
        <span className="text-[11px]">Detected Colors:</span>
        <div className="flex items-center -space-x-1">
          {modelColors.map((color, idx) => {
            const r = Math.round(color[0] * 255);
            const g = Math.round(color[1] * 255);
            const b = Math.round(color[2] * 255);
            return (
              <div
                key={idx}
                title={`Model Color #${idx + 1}`}
                className="w-4 h-4 rounded-full border border-black/50 shadow-sm"
                style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

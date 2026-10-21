import React, { useState, useRef } from 'react';
import { FontItem, INSTALLED_FONTS } from '../data/fonts';
import { CustomFont } from '../types';
import {
  Type,
  X,
  Upload,
  Copy,
  Check,
  Sparkles,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface FontManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customFonts: CustomFont[];
  onAddCustomFont: (font: CustomFont) => void;
  onSelectFontForCode: (fontName: string) => void;
}

export const FontManagerModal: React.FC<FontManagerModalProps> = ({
  isOpen,
  onClose,
  customFonts,
  onAddCustomFont,
  onSelectFontForCode,
}) => {
  const [copiedFont, setCopiedFont] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopy = (fontName: string) => {
    navigator.clipboard.writeText(`font = "${fontName}";`);
    setCopiedFont(fontName);
    setTimeout(() => setCopiedFont(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const baseName = file.name.replace(/\.[^.]+$/, '');

      onAddCustomFont({
        name: cleanName,
        displayName: `${baseName} (Özel Yüklenen)`,
        data: buffer,
        style: 'Regular',
      });
    } catch (err) {
      console.error('Failed to read font file:', err);
      alert('Font dosyası okunamadı: ' + err);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#1c1c20] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#222228]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-bambu-green/20 border border-bambu-green/40 flex items-center justify-center text-bambu-green">
              <Type size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                OpenSCAD Font & Yazı Tipleri Yöneticisi
              </h2>
              <p className="text-xs text-neutral-400">
                3D modelinizde metin yazmak için desteklenen fontlar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-bambu-green/10 border-b border-bambu-green/20 flex items-start gap-2.5 text-xs text-neutral-300">
          <Info size={16} className="text-bambu-green shrink-0 mt-0.5" />
          <span>
            OpenSCAD'de font kullanmak için: <code className="text-bambu-green font-mono bg-black/40 px-1.5 py-0.5 rounded">text("Yazı", font = "Segoe Script:style=Bold");</code> şeklinde tam font adını yazabilirsiniz.
          </span>
        </div>

        {/* Font List Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            Yüklü & Desteklenen Fontlar ({INSTALLED_FONTS.length + customFonts.length})
          </div>

          {/* Bundled Fonts */}
          {INSTALLED_FONTS.map(font => {
            const isCopied = copiedFont === font.name;

            return (
              <div
                key={font.id}
                className="flex items-center justify-between p-3.5 bg-[#25252c] hover:bg-[#2b2b33] border border-white/5 rounded-xl transition-all"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{font.displayName}</span>
                    <span className="text-[10px] bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full font-medium">
                      {font.category}
                    </span>
                  </div>

                  {/* Live Visual Preview */}
                  <div
                    className="text-base text-bambu-green font-medium my-1"
                    style={{ fontFamily: font.cssFamily }}
                  >
                    {font.previewText || 'Yaşasın Cumhuriyet 123'}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                    <span>Kod parametresi:</span>
                    <code className="text-neutral-200 bg-black/40 px-1.5 py-0.5 rounded">
                      "{font.name}"
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(font.name)}
                    title="Font kodunu panoya kopyala"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    {isCopied ? <Check size={14} className="text-bambu-green" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectFontForCode(font.name);
                      onClose();
                    }}
                    title="Bu fontu geçerli modelde uygula"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bambu-green hover:bg-bambu-green-dark text-black text-xs font-bold transition-all shadow-md shadow-bambu-green/10"
                  >
                    <Sparkles size={13} />
                    <span>Uygula</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* User Uploaded Custom Fonts */}
          {customFonts.map(cf => (
            <div
              key={cf.name}
              className="flex items-center justify-between p-3.5 bg-bambu-green/5 border border-bambu-green/30 rounded-xl"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{cf.displayName}</span>
                  <span className="text-[10px] bg-bambu-green/20 text-bambu-green px-2 py-0.5 rounded-full font-bold">
                    ÖZEL YÜKLENEN
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Font dosyası: <code className="text-white bg-black/40 px-1.5 py-0.5 rounded">"{cf.name}"</code>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectFontForCode(cf.name.replace(/\.[^.]+$/, ''));
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bambu-green hover:bg-bambu-green-dark text-black text-xs font-bold transition-all"
              >
                <Sparkles size={13} />
                <span>Uygula</span>
              </button>
            </div>
          ))}
        </div>

        {/* Modal Footer with Custom Font Upload Button */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#222228]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".ttf,.otf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            <Upload size={15} className="text-bambu-green" />
            <span>Bilgisayardan Yeni Font Yükle (.ttf / .otf)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

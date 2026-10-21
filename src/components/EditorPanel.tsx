import React, { useRef, useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  Download,
  Check,
  Upload,
  Plus,
  ClipboardPaste,
  Trash2,
  AlertCircle,
  FileCode2,
} from 'lucide-react';

interface EditorPanelProps {
  code: string;
  onChange: (value: string) => void;
  onLoadNewCode: (newCode: string, filename?: string) => void;
  error?: string;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  code,
  onChange,
  onLoadNewCode,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute line numbers
  const lineCount = React.useMemo(() => {
    return Math.max(1, code.split('\n').length);
  }, [code]);

  const lineNumbers = React.useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  // Synchronize scroll between line numbers and textarea
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle Tab key in textarea (insert 2 spaces instead of losing focus)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        onLoadNewCode(text, 'clipboard.scad');
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      // If clipboard permission is blocked, focus textarea and select all for manual paste
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        onLoadNewCode(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadScad = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.scad';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCode = () => {
    if (window.confirm('Clear editor and start a new blank OpenSCAD script?')) {
      onLoadNewCode('// New OpenSCAD Model\ncolor([0.0, 0.68, 0.26]) cube([20, 20, 10]);\n', 'new.scad');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#151518] border-r border-white/10 overflow-hidden select-text">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".scad,.txt,.openscad"
        className="hidden"
      />

      {/* Editor Header Bar with External Import Actions */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#1c1c20] border-b border-white/10 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-bambu-green" />
          <span className="font-bold text-neutral-200">OpenSCAD Code</span>
          <span className="text-[10px] text-neutral-400 font-mono bg-white/5 px-2 py-0.5 rounded">
            {lineCount} lines
          </span>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Upload .scad File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload .scad file from your computer (Dosya Yükle)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-neutral-200 hover:text-white bg-bambu-green/20 hover:bg-bambu-green/30 border border-bambu-green/40 transition-colors font-medium text-[11px]"
          >
            <Upload size={13} className="text-bambu-green" />
            <span>Open .scad</span>
          </button>

          {/* Paste from Clipboard Button */}
          <button
            onClick={pasteCode}
            title="Paste code from clipboard (Panodan Yapıştır)"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-[11px]"
          >
            {pasted ? <Check size={13} className="text-bambu-green" /> : <ClipboardPaste size={13} />}
            <span>{pasted ? 'Pasted!' : 'Paste'}</span>
          </button>

          {/* Copy Code */}
          <button
            onClick={copyCode}
            title="Copy all code to clipboard"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors text-[11px]"
          >
            {copied ? <Check size={13} className="text-bambu-green" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download .scad */}
          <button
            onClick={downloadScad}
            title="Download .scad file"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Download size={13} />
          </button>

          {/* Clear / Blank */}
          <button
            onClick={clearCode}
            title="Clear and start new blank script"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Editor Main Text Area with Synchronized Line Numbers */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-[13px] bg-[#141416]">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="w-12 py-3 bg-[#18181c] text-neutral-600 select-none text-right pr-3 overflow-hidden border-r border-white/5 shrink-0"
        >
          {lineNumbers.map(n => (
            <div key={n} className="leading-6 text-[12px]">
              {n}
            </div>
          ))}
        </div>

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={e => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder="Paste or write your OpenSCAD code here..."
          className="flex-1 h-full py-3 px-4 bg-transparent text-neutral-200 resize-none outline-none leading-6 overflow-y-auto whitespace-pre font-mono custom-scrollbar selection:bg-bambu-green/30"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            tabSize: 2,
          }}
        />

        {/* Floating Quick Drop / Paste Hint if empty */}
        {code.trim().length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-500">
            <FileCode2 size={36} className="text-neutral-600 mb-2" />
            <p className="text-sm font-sans font-medium">Editor is empty</p>
            <p className="text-xs font-sans text-neutral-600 mt-1">
              Paste OpenSCAD code or drag & drop a .scad file here
            </p>
          </div>
        )}

        {/* Error notification banner if any */}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-red-950/95 border-t border-red-500/50 backdrop-blur-md text-xs text-red-200 font-mono flex items-start gap-2 z-20 shadow-2xl">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 overflow-hidden">
              <span className="text-red-400 font-bold block mb-0.5">Compilation Notice:</span>
              <span className="truncate block">{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

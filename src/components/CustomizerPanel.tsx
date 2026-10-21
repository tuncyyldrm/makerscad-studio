import React from 'react';
import { ParameterSet, ScadParameter } from '../types';
import { RotateCcw, Sliders, ChevronDown, ChevronRight, Hash, Type, ToggleLeft, Palette } from 'lucide-react';
import { INSTALLED_FONTS } from '../data/fonts';

interface CustomizerPanelProps {
  parameterSet: ParameterSet;
  values: Record<string, any>;
  onChange: (name: string, val: any) => void;
  onResetAll: () => void;
  onOpenFontManager?: () => void;
}

const QUICK_COLORS = [
  '#00AE42', // Bambu Green
  '#FFFFFF', // White
  '#1E1E1E', // Charcoal
  '#E74C3C', // Red
  '#FF5C00', // Orange
  '#F1C40F', // Yellow
  '#2980B9', // Blue
  '#8E44AD', // Purple
];

export const CustomizerPanel: React.FC<CustomizerPanelProps> = ({
  parameterSet,
  values,
  onChange,
  onResetAll,
  onOpenFontManager,
}) => {
  // Group parameters by their group name
  const groups = React.useMemo(() => {
    const map = new Map<string, ScadParameter[]>();
    parameterSet.parameters.forEach(p => {
      const g = p.group || 'General';
      const list = map.get(g) || [];
      list.push(p);
      map.set(g, list);
    });
    return Array.from(map.entries());
  }, [parameterSet]);

  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] border-r border-white/10 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
        <div className="flex items-center gap-2">
          <Sliders size={16} className="text-bambu-green" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-neutral-200">
            Model Parameters
          </h2>
        </div>

        <button
          onClick={onResetAll}
          title="Reset all parameters to default"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Parameter Groups Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 text-xs">
            <p>No customizable parameters found.</p>
            <p className="mt-1">
              Add variables like <code className="text-bambu-green">width = 50; // [10:100]</code> or{' '}
              <code className="text-bambu-green">base_color = "#00AE42";</code> to your script.
            </p>
          </div>
        ) : (
          groups.map(([groupName, params]) => {
            const isCollapsed = !!collapsedGroups[groupName];

            return (
              <div
                key={groupName}
                className="bg-[#202025] rounded-xl border border-white/5 overflow-hidden shadow-sm"
              >
                {/* Group Accordion Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    {groupName}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight size={15} className="text-neutral-500" />
                  ) : (
                    <ChevronDown size={15} className="text-neutral-500" />
                  )}
                </button>

                {/* Group Body */}
                {!isCollapsed && (
                  <div className="p-3.5 space-y-3.5">
                    {params.map(param => {
                      const val = values[param.name] !== undefined ? values[param.name] : param.initial;

                      // Check if parameter represents a color
                      const isColor =
                        param.name.toLowerCase().includes('color') ||
                        param.name.toLowerCase().includes('colour') ||
                        (typeof val === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(val.trim())) ||
                        (param.description && param.description.toLowerCase().includes('color'));

                      return (
                        <div key={param.name} className="space-y-1.5">
                          {/* Parameter Label & Value Display */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-300 font-medium">
                              {param.name.replace(/_/g, ' ')}
                            </span>
                            {param.type === 'number' && (
                              <span className="font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded text-[11px]">
                                {val}
                              </span>
                            )}
                          </div>

                          {/* Control By Type */}
                          {isColor ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="relative w-8 h-8 rounded-lg border border-white/20 shadow-inner flex items-center justify-center shrink-0 cursor-pointer overflow-hidden group"
                                  style={{
                                    backgroundColor:
                                      typeof val === 'string' && val.startsWith('#')
                                        ? val
                                        : '#00AE42',
                                  }}
                                >
                                  <input
                                    type="color"
                                    value={
                                      typeof val === 'string' && /^#([0-9A-Fa-f]{6})$/.test(val)
                                        ? val
                                        : '#00AE42'
                                    }
                                    onChange={e => onChange(param.name, e.target.value.toUpperCase())}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  />
                                  <Palette
                                    size={14}
                                    className="text-white drop-shadow opacity-70 group-hover:opacity-100 pointer-events-none"
                                  />
                                </div>

                                <input
                                  type="text"
                                  value={val}
                                  onChange={e => onChange(param.name, e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-bambu-green uppercase"
                                  placeholder="#00AE42"
                                />
                              </div>

                              {/* Quick Swatches */}
                              <div className="flex items-center gap-1.5 pt-1">
                                {QUICK_COLORS.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => onChange(param.name, c)}
                                    className={`w-4 h-4 rounded-full border transition-all ${
                                      val?.toUpperCase() === c
                                        ? 'border-white scale-125 shadow-lg'
                                        : 'border-black/50 hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : param.type === 'number' ? (
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={param.min ?? 0}
                                max={param.max ?? 100}
                                step={param.step ?? 1}
                                value={val}
                                onChange={e => onChange(param.name, parseFloat(e.target.value))}
                                className="flex-1 accent-bambu-green h-1.5 bg-white/10 rounded-lg cursor-pointer"
                              />
                              <input
                                type="number"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={val}
                                onChange={e => onChange(param.name, parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-bambu-green text-white"
                              />
                            </div>
                          ) : param.type === 'boolean' ? (
                            <button
                              type="button"
                              onClick={() => onChange(param.name, !val)}
                              className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                val
                                  ? 'bg-bambu-green/15 border-bambu-green/40 text-bambu-green'
                                  : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                              }`}
                            >
                              <span>{val ? 'Enabled' : 'Disabled'}</span>
                              <div
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                                  val ? 'bg-bambu-green' : 'bg-neutral-700'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-black transition-transform ${
                                    val ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </button>
                          ) : param.type === 'enum' && param.options ? (
                            <div className="relative">
                              <select
                                value={val}
                                onChange={e =>
                                  onChange(
                                    param.name,
                                    isNaN(Number(e.target.value))
                                      ? e.target.value
                                      : Number(e.target.value)
                                  )
                                }
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs font-medium text-white appearance-none focus:outline-none focus:border-bambu-green cursor-pointer"
                              >
                                {param.options.map(opt => (
                                  <option key={String(opt.value)} value={opt.value}>
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                size={14}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                              />
                            </div>
                          ) : (param.name.toLowerCase().includes('font') || param.name.toLowerCase().includes('yazi')) ? (
                            <div className="space-y-2">
                              <div className="relative">
                                <select
                                  value={val}
                                  onChange={e => onChange(param.name, e.target.value)}
                                  className="w-full pl-3 pr-8 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-medium text-white appearance-none focus:outline-none focus:border-bambu-green cursor-pointer"
                                >
                                  <optgroup label="Yüklü Fontlar (OpenSCAD Fonts)">
                                    {INSTALLED_FONTS.map(f => (
                                      <option key={f.name} value={f.name}>
                                        {f.displayName}
                                      </option>
                                    ))}
                                  </optgroup>
                                  {val && !INSTALLED_FONTS.some(f => f.name === val) && (
                                    <option value={val}>
                                      Özel: {val}
                                    </option>
                                  )}
                                </select>
                                <ChevronDown
                                  size={14}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={e => onChange(param.name, e.target.value)}
                                  className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-bambu-green"
                                  placeholder="Örn: Segoe Script:style=Bold"
                                />
                                {onOpenFontManager && (
                                  <button
                                    type="button"
                                    onClick={onOpenFontManager}
                                    title="Font Yöneticisini Aç"
                                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-neutral-300 hover:text-white flex items-center gap-1 shrink-0 transition-colors"
                                  >
                                    <Type size={13} className="text-pink-400" />
                                    <span>Gözat</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={e => onChange(param.name, e.target.value)}
                              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-bambu-green"
                              placeholder={param.name}
                            />
                          )}

                          {/* Inline Description */}
                          {param.description && (
                            <p className="text-[10px] text-neutral-500">{param.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

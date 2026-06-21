export default function ManualDimensions({ widthMm, heightMm, bgColor, onChange }) {
  return (
    <div className="space-y-3">
      <label className="section-label">Custom Dimensions</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Width (mm)</label>
          <input
            type="number"
            min={10}
            max={200}
            step={0.5}
            value={widthMm}
            onChange={(e) => onChange({ widthMm: parseFloat(e.target.value) || 35 })}
            className="input-base"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Height (mm)</label>
          <input
            type="number"
            min={10}
            max={200}
            step={0.5}
            value={heightMm}
            onChange={(e) => onChange({ heightMm: parseFloat(e.target.value) || 45 })}
            className="input-base"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Background Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => onChange({ bgColor: e.target.value })}
            className="input-base font-mono"
            maxLength={7}
            placeholder="#FFFFFF"
          />
        </div>
      </div>
    </div>
  );
}

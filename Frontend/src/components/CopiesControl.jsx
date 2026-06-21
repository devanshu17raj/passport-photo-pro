export default function CopiesControl({ photos, copies, onChange }) {
  if (photos.length === 0) return null;

  function updateCopy(index, value) {
    const next = [...copies];
    next[index] = Number(value);
    onChange(next);
  }

  const total = copies.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="section-label mb-0">Copies per Photo</label>
        <span className="text-xs font-semibold text-slate-700">{total} total</span>
      </div>

      {photos.map((file, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-10 rounded overflow-hidden border border-slate-200 flex-shrink-0">
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <input
              type="range"
              min={1}
              max={20}
              value={copies[i] ?? 6}
              onChange={(e) => updateCopy(i, e.target.value)}
              className="w-full accent-cyan-600 cursor-pointer"
            />
          </div>
          <span className="w-6 text-center text-sm font-semibold text-cyan-700 flex-shrink-0">
            {copies[i] ?? 6}
          </span>
        </div>
      ))}
    </div>
  );
}

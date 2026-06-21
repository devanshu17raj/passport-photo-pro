import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function PresetSelector({ presets, onSelect, selectedCountry, selectedDoc }) {
  const [open, setOpen] = useState(false);

  const countries = Object.keys(presets);

  function handleCountry(country) {
    const firstDoc = presets[country]?.documents?.[0];
    if (firstDoc) onSelect(country, firstDoc);
    setOpen(false);
  }

  function handleDoc(doc) {
    onSelect(selectedCountry, doc);
  }

  const docs = selectedCountry ? presets[selectedCountry]?.documents || [] : [];

  return (
    <div className="space-y-3">
      {/* Country picker */}
      <div>
        <label className="section-label">Country</label>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="input-base flex items-center justify-between text-left"
          >
            <span>
              {selectedCountry
                ? `${presets[selectedCountry]?.flag} ${selectedCountry}`
                : "Select country…"}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg
                            max-h-52 overflow-y-auto py-1">
              {countries.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCountry(c)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2
                    transition-colors ${c === selectedCountry ? "text-cyan-700 font-semibold bg-cyan-50/60" : "text-slate-700"}`}
                >
                  <span>{presets[c].flag}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document type pills */}
      {selectedCountry && docs.length > 0 && (
        <div>
          <label className="section-label">Document Type</label>
          <div className="flex flex-wrap gap-2">
            {docs.map((doc) => (
              <button
                key={doc.name}
                onClick={() => handleDoc(doc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150
                  ${selectedDoc?.name === doc.name
                    ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-cyan-600/40 hover:text-cyan-700"
                  }`}
              >
                {doc.name}
              </button>
            ))}
          </div>

          {/* Spec badge */}
          {selectedDoc && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50
                            border border-slate-200 rounded-lg text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{selectedDoc.width_mm}×{selectedDoc.height_mm} mm</span>
              <span>·</span>
              <span
                className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                style={{ background: selectedDoc.bg_color }}
              />
              <span>{selectedDoc.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

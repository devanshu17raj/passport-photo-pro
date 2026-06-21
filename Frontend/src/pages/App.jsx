import { useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Download, Loader2, Camera, History, Settings, ChevronDown, ChevronUp, Zap } from "lucide-react";

import DropZone         from "../components/DropZone";
import PresetSelector   from "../components/PresetSelector";
import SheetPreview     from "../components/SheetPreview";
import CopiesControl    from "../components/CopiesControl";
import ManualDimensions from "../components/ManualDimensions";
import HistoryPanel     from "../components/HistoryPanel";

import { usePresets }   from "../hooks/usePresets";
import { useHistory }   from "../hooks/useHistory";
import { generatePDF }  from "../utils/api";

export default function App() {
  // Photos
  const [photos, setPhotos]       = useState([]);
  const [copies, setCopies]       = useState([6]);

  // Dimensions & settings
  const [widthMm,  setWidthMm]    = useState(35);
  const [heightMm, setHeightMm]   = useState(45);
  const [bgColor,  setBgColor]    = useState("#FFFFFF");
  const [skipBg,   setSkipBg]     = useState(false);

  // Country preset
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedDoc,     setSelectedDoc]     = useState(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showManual,  setShowManual]  = useState(false);

  const { presets, loading: presetsLoading } = usePresets();
  const { history, loading: histLoading, refresh: refreshHistory, remove: deleteRecord } = useHistory();

  // ── Photo management ───────────────────────────────────────────────────────
  const handleAdd = useCallback((newFiles) => {
    setPhotos((prev) => {
      const next = [...prev, ...newFiles].slice(0, 5);
      setCopies((c) => {
        const arr = [...c];
        while (arr.length < next.length) arr.push(6);
        return arr.slice(0, next.length);
      });
      return next;
    });
  }, []);

  const handleRemove = useCallback((index) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setCopies((c) => c.filter((_, i) => i !== index));
      return next;
    });
  }, []);

  // ── Preset selection ───────────────────────────────────────────────────────
  function handlePresetSelect(country, doc) {
    setSelectedCountry(country);
    setSelectedDoc(doc);
    setWidthMm(doc.width_mm);
    setHeightMm(doc.height_mm);
    setBgColor(doc.bg_color);
    setShowManual(false);
  }

  // ── Manual dimension change ────────────────────────────────────────────────
  function handleManualChange({ widthMm: w, heightMm: h, bgColor: bg }) {
    if (w !== undefined) { setWidthMm(w); setSelectedDoc(null); }
    if (h !== undefined) { setHeightMm(h); setSelectedDoc(null); }
    if (bg !== undefined) setBgColor(bg);
  }

  // ── Generate PDF ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (photos.length === 0) {
      toast.error("Upload at least one photo first.");
      return;
    }
    setGenerating(true);
    const tid = toast.loading("Removing background & building PDF…");

    try {
      const blob = await generatePDF({
        photos,
        widthMm,
        heightMm,
        bgColor,
        country:      selectedCountry,
        documentType: selectedDoc?.name || "",
        copies,
        skipBgRemoval: skipBg,
      });

      // Trigger browser download
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const name = `passport_${selectedDoc?.name || "photo"}_${widthMm}x${heightMm}mm.pdf`
                     .replace(/\s+/g, "_");
      link.href     = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded!", { id: tid });
      refreshHistory();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong. Try again.";
      toast.error(msg, { id: tid });
    } finally {
      setGenerating(false);
    }
  }

  const totalCopies = copies.reduce((a, b) => a + b, 0);
  const ready = photos.length > 0 && !generating;

  return (
    <div className="min-h-screen bg-paper">
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: "10px", fontSize: "13px" },
      }} />

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center shadow-sm">
              <Camera size={14} className="text-white" />
            </div>
            <span className="font-bold text-ink tracking-tight">Passport Photo Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((s) => !s)}
              className={`btn-ghost text-sm ${showHistory ? "border-cyan-600/30 text-cyan-700 bg-cyan-50" : ""}`}
            >
              <History size={14} />
              History
              {history.length > 0 && (
                <span className="bg-cyan-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── History drawer ───────────────────────────────────────────── */}
      {showHistory && (
        <div className="bg-white border-b border-slate-100 animate-fade-up">
          <div className="max-w-5xl mx-auto px-5 py-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Generation History</h2>
            <HistoryPanel history={history} onDelete={deleteRecord} loading={histLoading} />
          </div>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Hero line */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Print-ready passport photos in seconds.
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Upload once — get a 300 DPI A4 sheet, correctly sized for any country and document type. Free, private, no account needed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* ── Left column: controls ───────────────────────────────── */}
          <div className="space-y-5">

            {/* Upload */}
            <div className="card p-5">
              <p className="section-label">Your Photo</p>
              <DropZone photos={photos} onAdd={handleAdd} onRemove={handleRemove} />
            </div>

            {/* Country presets */}
            <div className="card p-5">
              {presetsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Loading presets…
                </div>
              ) : (
                <PresetSelector
                  presets={presets}
                  onSelect={handlePresetSelect}
                  selectedCountry={selectedCountry}
                  selectedDoc={selectedDoc}
                />
              )}
            </div>

            {/* Copies */}
            {photos.length > 0 && (
              <div className="card p-5 animate-fade-up">
                <CopiesControl photos={photos} copies={copies} onChange={setCopies} />
              </div>
            )}

            {/* Advanced / manual override */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowManual((s) => !s)}
                className="w-full flex items-center justify-between px-5 py-3.5
                           text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings size={14} className="text-slate-400" />
                  Custom dimensions & options
                </div>
                {showManual ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {showManual && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4 animate-fade-up">
                  <ManualDimensions
                    widthMm={widthMm}
                    heightMm={heightMm}
                    bgColor={bgColor}
                    onChange={handleManualChange}
                  />
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setSkipBg((s) => !s)}
                      className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer
                        ${skipBg ? "bg-cyan-600" : "bg-slate-200"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                        transition-transform ${skipBg ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Skip background removal</p>
                      <p className="text-xs text-slate-400">Keep original background — faster processing</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!ready}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Generate PDF
                  {photos.length > 0 && (
                    <span className="ml-1 bg-white/20 px-2 py-0.5 rounded text-xs font-semibold">
                      {totalCopies} copies
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* ── Right column: live preview ──────────────────────────── */}
          <div className="space-y-4">
            <div className="card p-4 sticky top-20">
              <SheetPreview
                photos={photos}
                widthMm={widthMm}
                heightMm={heightMm}
                bgColor={bgColor}
                copies={totalCopies}
              />
            </div>

            {/* How-to steps */}
            <div className="card p-4 space-y-3">
              <p className="section-label">How it works</p>
              {[
                ["1", "Upload your selfie or portrait photo"],
                ["2", "Pick your country & document type"],
                ["3", "Adjust copies if needed"],
                ["4", "Hit Generate PDF — instant download"],
              ].map(([n, text]) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200
                                   text-cyan-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {n}
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-16 py-6">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between text-xs text-slate-400">
          <span>Passport Photo Pro — open source, no API keys, no account needed.</span>
          <span>AI background removal runs locally · your photos never leave your session</span>
        </div>
      </footer>
    </div>
  );
}

import { Download, Trash2, Clock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPanel({ history, onDelete, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        Loading history…
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock size={24} className="text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No generations yet this session.</p>
        <p className="text-xs text-slate-300 mt-1">Your PDFs will appear here for re-download.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-100
                     hover:border-slate-200 hover:bg-slate-50/60 transition-all group"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {r.country && (
                <span className="text-xs font-semibold text-slate-700">{r.country}</span>
              )}
              {r.document_type && (
                <span className="text-xs text-slate-400">— {r.document_type}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400">
                {r.photo_width_mm}×{r.photo_height_mm} mm
              </span>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400">{r.total_copies} copies</span>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] text-slate-400">{r.num_pages}p</span>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5">{formatDate(r.created_at)}</p>
          </div>

          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            <a
              href={`${API_BASE}/api/history/${r.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
              title="Re-download PDF"
            >
              <Download size={14} />
            </a>
            <button
              onClick={() => onDelete(r.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

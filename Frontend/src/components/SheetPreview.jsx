import { useMemo } from "react";

const A4_W_MM = 210;
const A4_H_MM = 297;
const MARGIN_MM = 8;
const SPACING_MM = 2.5;
const BORDER_MM = 0.5;

function calcLayout(widthMm, heightMm, copies) {
  const usableW = A4_W_MM - 2 * MARGIN_MM;
  const usableH = A4_H_MM - 2 * MARGIN_MM;
  const cellW = widthMm + 2 * BORDER_MM;
  const cellH = heightMm + 2 * BORDER_MM;
  const perRow  = Math.max(1, Math.floor((usableW + SPACING_MM) / (cellW + SPACING_MM)));
  const perCol  = Math.max(1, Math.floor((usableH + SPACING_MM) / (cellH + SPACING_MM)));
  const perPage = perRow * perCol;
  const pages   = Math.ceil(copies / perPage);
  return { perRow, perCol, perPage, pages, cellW, cellH };
}

export default function SheetPreview({ photos, widthMm, heightMm, bgColor, copies }) {
  const { perRow, perCol, cellW, cellH, pages } = useMemo(
    () => calcLayout(widthMm, heightMm, copies),
    [widthMm, heightMm, copies]
  );

  // Render scale: fit the preview into 240px wide
  const scale = 240 / A4_W_MM;
  const previewW = A4_W_MM * scale;
  const previewH = A4_H_MM * scale;

  const cells = Array.from({ length: Math.min(copies, perRow * perCol) });

  // Get preview URL for first photo
  const previewUrl = photos.length > 0 ? URL.createObjectURL(photos[0]) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label mb-0">Sheet Preview</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{perRow} × {perCol} per page</span>
          {pages > 1 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pages} pages
            </span>
          )}
        </div>
      </div>

      {/* A4 sheet */}
      <div
        className="relative mx-auto shadow-md rounded-sm overflow-hidden border border-slate-200"
        style={{ width: previewW, height: previewH, background: "#fff" }}
      >
        {/* Margin guides */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: `${MARGIN_MM * scale}px solid transparent`,
          }}
        />

        {/* Photo grid */}
        <div
          className="absolute"
          style={{
            top:  MARGIN_MM * scale,
            left: MARGIN_MM * scale,
          }}
        >
          {cells.map((_, i) => {
            const col = i % perRow;
            const row = Math.floor(i / perRow);
            const x = col * (cellW + SPACING_MM) * scale;
            const y = row * (cellH + SPACING_MM) * scale;
            return (
              <div
                key={i}
                className="absolute overflow-hidden"
                style={{
                  left:   x,
                  top:    y,
                  width:  cellW * scale,
                  height: cellH * scale,
                  border: `${Math.max(0.5, BORDER_MM * scale)}px solid #CBD5E1`,
                  background: bgColor || "#FFFFFF",
                  borderRadius: 1,
                }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ display: "block" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state overlay */}
        {!previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[9px] text-slate-300 font-medium tracking-wide uppercase">
              Upload a photo to preview
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>A4 · 300 DPI print-ready</span>
        <span className="font-semibold text-slate-700">{copies} copies · {pages} {pages === 1 ? "page" : "pages"}</span>
      </div>
    </div>
  );
}

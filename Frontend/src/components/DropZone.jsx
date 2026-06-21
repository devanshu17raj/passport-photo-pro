import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon } from "lucide-react";

const ACCEPTED = { "image/jpeg": [], "image/png": [], "image/webp": [], "image/bmp": [] };

export default function DropZone({ photos, onAdd, onRemove }) {
  const onDrop = useCallback((accepted) => {
    const remaining = 5 - photos.length;
    onAdd(accepted.slice(0, remaining));
  }, [photos, onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 5,
    maxSize: 15 * 1024 * 1024,
    disabled: photos.length >= 5,
  });

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${photos.length >= 5 ? "opacity-40 cursor-not-allowed" : ""}
          ${isDragActive
            ? "border-cyan-600 bg-cyan-50"
            : "border-slate-200 hover:border-cyan-600/50 hover:bg-slate-50 animate-pulse-border"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
            ${isDragActive ? "bg-cyan-100" : "bg-slate-100"}`}>
            <Upload size={18} className={isDragActive ? "text-cyan-600" : "text-slate-400"} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragActive ? "Drop your photo here" : "Drag photo here, or click to browse"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG, WEBP, BMP · max 15 MB · up to 5 photos</p>
          </div>
        </div>
      </div>

      {/* Preview thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((file, i) => (
            <div key={i} className="relative group">
              <div className="w-16 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 hover:bg-red-500
                           text-white rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-sm"
              >
                <X size={10} />
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1 truncate w-16">
                {file.name.length > 10 ? file.name.slice(0, 9) + "…" : file.name}
              </p>
            </div>
          ))}

          {/* Add more slot */}
          {photos.length < 5 && (
            <div {...getRootProps()} className="w-16 h-20 rounded-lg border-2 border-dashed border-slate-200
              hover:border-cyan-600/50 flex items-center justify-center cursor-pointer transition-colors">
              <input {...getInputProps()} />
              <ImageIcon size={16} className="text-slate-300" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

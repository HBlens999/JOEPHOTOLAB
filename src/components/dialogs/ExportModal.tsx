import React, { useState } from "react";
import { Download, X, FileImage, Layers } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { encodeTIFF, encodePSD, scaleCanvasToTarget } from "../../engine/exportFormats";
import { WebGLRenderer } from "../../engine/WebGLRenderer";

export const ExportModal: React.FC = () => {
  const {
    document: doc,
    isExportModalOpen,
    setExportModalOpen,
  } = useEditorStore();

  const [format, setFormat] = useState<"png" | "jpeg" | "webp" | "tiff" | "psd">("png");
  const [quality, setQuality] = useState(92);
  const [scaleMode, setScaleMode] = useState<"1x" | "2x" | "4x" | "8k">("1x");
  const [isExporting, setIsExporting] = useState(false);

  if (!isExportModalOpen) return null;

  // Calculate target dimensions
  let targetWidth = doc.width;
  let targetHeight = doc.height;
  if (scaleMode === "2x") {
    targetWidth = doc.width * 2;
    targetHeight = doc.height * 2;
  } else if (scaleMode === "4x") {
    targetWidth = doc.width * 4;
    targetHeight = doc.height * 4;
  } else if (scaleMode === "8k") {
    const maxDim = 7680;
    if (doc.width >= doc.height) {
      targetWidth = maxDim;
      targetHeight = Math.round((doc.height / doc.width) * maxDim);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round((doc.width / doc.height) * maxDim);
    }
  }

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Step 1: Render full-fidelity composite canvas with WebGLRenderer
      const compCanvas = document.createElement("canvas");
      compCanvas.width = doc.width;
      compCanvas.height = doc.height;

      const glCanvas = document.createElement("canvas");
      glCanvas.width = doc.width;
      glCanvas.height = doc.height;

      const renderer = new WebGLRenderer(glCanvas);
      renderer.renderDocument(doc, compCanvas);
      renderer.destroy();

      // Step 2: Scale if needed
      const finalCanvas = scaleCanvasToTarget(compCanvas, scaleMode);

      let blob: Blob | null = null;
      let filename = `${doc.name.replace(/\.[^/.]+$/, "")}_${scaleMode}.${format}`;

      if (format === "tiff") {
        blob = encodeTIFF(finalCanvas);
      } else if (format === "psd") {
        blob = encodePSD(doc, finalCanvas);
      } else if (format === "jpeg") {
        blob = await new Promise((res) => finalCanvas.toBlob(res, "image/jpeg", quality / 100));
      } else if (format === "webp") {
        blob = await new Promise((res) => finalCanvas.toBlob(res, "image/webp", quality / 100));
      } else {
        blob = await new Promise((res) => finalCanvas.toBlob(res, "image/png"));
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExportModalOpen(false);
      useEditorStore.getState().showNotification(`Exported ${filename} successfully`, "success");
    } catch (err: any) {
      console.error("Export failed:", err);
      useEditorStore.getState().showNotification(`Failed to export image: ${err?.message || "unknown error"}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-[#2d3240] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-xs text-[#8e95a7] select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262a36] bg-[#14161d]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Document</span>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-slate-200 font-medium mb-1.5">File Format</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(["png", "jpeg", "webp", "tiff", "psd"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`py-2 rounded uppercase font-semibold text-[11px] transition-all border ${
                    format === fmt
                      ? "bg-cyan-950/70 border-cyan-500 text-cyan-200 shadow-sm"
                      : "bg-[#20242f] border-transparent text-[#7a8192] hover:text-white"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Resolution (1x, 2x, 4x, 8K) */}
          <div>
            <label className="block text-slate-200 font-medium mb-1.5">Resolution Scale</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["1x", "2x", "4x", "8k"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScaleMode(mode)}
                  className={`py-2 rounded font-semibold text-[11px] transition-all border uppercase ${
                    scaleMode === mode
                      ? "bg-blue-950/70 border-blue-500 text-blue-200 shadow-sm"
                      : "bg-[#20242f] border-transparent text-[#7a8192] hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider for lossy JPEG / WebP */}
          {["jpeg", "webp"].includes(format) && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-200 font-medium">Quality</span>
                <span className="font-mono text-slate-200">{quality}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          )}

          {/* Output Dimensions Readout */}
          <div className="bg-[#13151b] border border-[#272a36] rounded p-3 flex justify-between items-center font-mono tabular-nums">
            <span className="text-[#6d7486]">Output Canvas:</span>
            <span className="text-white font-medium">
              {targetWidth} × {targetHeight} px
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262a36] bg-[#14161d] flex items-center justify-end gap-2">
          <button
            onClick={() => setExportModalOpen(false)}
            className="px-3 py-1.5 rounded hover:bg-[#252936] text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Rendering..." : "Export File"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect } from "react";
import { Camera, Check, X } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { RAWPanel } from "../panels/RAWPanel";

export const RAWModal: React.FC = () => {
  const { isRAWModalOpen, setRAWModalOpen, document: doc } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Smoothly update canvas whenever doc or rawAdjustments change
  useEffect(() => {
    if (!isRAWModalOpen || !canvasRef.current) return;
    const sourceCanvas = doc.layers[0]?.canvas;
    if (!sourceCanvas) return;

    const canvas = canvasRef.current;
    if (canvas.width !== sourceCanvas.width || canvas.height !== sourceCanvas.height) {
      canvas.width = sourceCanvas.width;
      canvas.height = sourceCanvas.height;
    }
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sourceCanvas, 0, 0);
    }
  }, [isRAWModalOpen, doc.rawAdjustments, doc.layers]);

  if (!isRAWModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-[#2d3240] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-xs text-[#8e95a7] select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[#262a36] bg-[#14161d]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>RAW Development Studio — {doc.name}</span>
          </div>
          <button
            onClick={() => setRAWModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Large Preview */}
          <div className="flex-1 bg-[#0f1117] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="max-w-full max-h-full aspect-video rounded border border-[#2b303d] shadow-2xl bg-black flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          {/* Development Controls Panel */}
          <div className="w-80 border-l border-[#262a36] bg-[#181a21] overflow-hidden flex flex-col">
            <RAWPanel />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#262a36] bg-[#14161d] flex items-center justify-between">
          <span className="text-[11px] text-[#787f91]">
            Non-destructive 16-bit linear sensor processing pipeline
          </span>
          <button
            onClick={() => setRAWModalOpen(false)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Open in Joephotolab</span>
          </button>
        </div>
      </div>
    </div>
  );
};

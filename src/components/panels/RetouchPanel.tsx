import React from "react";
import {
  Stamp,
  Bandage,
  Grid3X3,
  Scissors,
  Layers,
  Sparkles,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const RetouchPanel: React.FC = () => {
  const {
    activeTool,
    setTool,
    brushSettings,
    setBrushSettings,
    cloneSettings,
    setCloneSettings,
    selection,
    featherSelection,
    invertSelection,
    deleteSelectionPixels,
    selectionToLayerMask,
    initPerspectivePoints,
    applyPerspectiveCorrection,
    cancelPerspective,
    perspectivePoints,
  } = useEditorStore();

  return (
    <div className="flex flex-col h-full bg-[#181a21] text-xs select-none overflow-y-auto p-3 space-y-5">
      {/* Retouching Tools Overview */}
      <div className="space-y-3">
        <span className="font-semibold text-slate-200 block border-b border-[#252834] pb-1.5">
          Retouching Engines
        </span>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setTool("spot-healing")}
            className={`p-2 rounded text-center border flex flex-col items-center gap-1 transition-all ${
              activeTool === "spot-healing"
                ? "bg-cyan-950/60 border-cyan-500 text-white"
                : "bg-[#20242f] border-transparent text-[#8e95a7] hover:text-white"
            }`}
          >
            <Bandage className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px]">Spot Heal</span>
          </button>

          <button
            onClick={() => setTool("healing")}
            className={`p-2 rounded text-center border flex flex-col items-center gap-1 transition-all ${
              activeTool === "healing"
                ? "bg-cyan-950/60 border-cyan-500 text-white"
                : "bg-[#20242f] border-transparent text-[#8e95a7] hover:text-white"
            }`}
          >
            <Bandage className="w-4 h-4 text-amber-400" />
            <span className="text-[10px]">Healing</span>
          </button>

          <button
            onClick={() => setTool("clone")}
            className={`p-2 rounded text-center border flex flex-col items-center gap-1 transition-all ${
              activeTool === "clone"
                ? "bg-cyan-950/60 border-cyan-500 text-white"
                : "bg-[#20242f] border-transparent text-[#8e95a7] hover:text-white"
            }`}
          >
            <Stamp className="w-4 h-4 text-purple-400" />
            <span className="text-[10px]">Clone</span>
          </button>
        </div>

        {/* Retouch Instructions */}
        {activeTool === "clone" && (
          <div className="bg-[#151922] p-2.5 rounded border border-[#272d3b] text-[11px] text-slate-300 space-y-1.5">
            <span className="font-medium text-purple-300 block">Clone Stamp Active</span>
            <p className="text-[10px] text-slate-400">
              Hold <strong>Alt + Click</strong> on canvas to sample reference pixels, then paint to copy actual raster data.
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">Source Point:</span>
              <span className="font-mono text-amber-400 text-[10px]">
                {cloneSettings.sourceX !== null
                  ? `${cloneSettings.sourceX}, ${cloneSettings.sourceY}`
                  : "Not Sampled"}
              </span>
            </div>
          </div>
        )}

        {activeTool === "healing" && (
          <div className="bg-[#151922] p-2.5 rounded border border-[#272d3b] text-[11px] text-slate-300 space-y-1.5">
            <span className="font-medium text-amber-300 block">Healing Brush Active</span>
            <p className="text-[10px] text-slate-400">
              Samples source texture and calculates destination luminance gradients to blend seamlessly without seam artifacts.
            </p>
          </div>
        )}

        {activeTool === "spot-healing" && (
          <div className="bg-[#151922] p-2.5 rounded border border-[#272d3b] text-[11px] text-slate-300 space-y-1.5">
            <span className="font-medium text-cyan-300 block">Spot Healing Active</span>
            <p className="text-[10px] text-slate-400">
              Click or drag directly over dust specks, skin blemishes, or sensor spots to synthesize surrounding textures automatically.
            </p>
          </div>
        )}
      </div>

      {/* Edge Refinement & Selections */}
      <div className="space-y-3 pt-3 border-t border-[#252834]">
        <span className="font-semibold text-slate-200 block border-b border-[#252834] pb-1.5">
          Selection & Mask Tools
        </span>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => featherSelection(4)}
              disabled={!selection.active}
              className="flex-1 py-1.5 bg-[#20242f] hover:bg-[#282e3d] disabled:opacity-40 text-slate-200 rounded text-center transition-colors"
            >
              Feather (4px)
            </button>
            <button
              onClick={invertSelection}
              disabled={!selection.active}
              className="flex-1 py-1.5 bg-[#20242f] hover:bg-[#282e3d] disabled:opacity-40 text-slate-200 rounded text-center transition-colors"
            >
              Invert Mask
            </button>
          </div>

          <button
            onClick={deleteSelectionPixels}
            disabled={!selection.active}
            className="w-full py-1.5 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-40 text-rose-300 rounded text-center border border-rose-900/40 transition-colors"
          >
            Delete Selected Pixels
          </button>

          <button
            onClick={selectionToLayerMask}
            disabled={!selection.active}
            className="w-full py-1.5 bg-[#20242f] hover:bg-[#282e3d] disabled:opacity-40 text-cyan-300 rounded text-center border border-cyan-800/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Convert to Layer Mask</span>
          </button>
        </div>
      </div>

      {/* Perspective Homography Correction */}
      <div className="space-y-3 pt-3 border-t border-[#252834]">
        <div className="flex items-center justify-between border-b border-[#252834] pb-1.5">
          <span className="font-semibold text-slate-200">Perspective Correction</span>
          <Grid3X3 className="w-4 h-4 text-cyan-400" />
        </div>

        <p className="text-[11px] text-[#8e95a7]">
          Straighten architectural photographs and converging perspective lines using 4-corner projective homography.
        </p>

        {perspectivePoints ? (
          <div className="space-y-2">
            <button
              onClick={applyPerspectiveCorrection}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-md transition-all"
            >
              Commit Perspective Transform
            </button>
            <button
              onClick={cancelPerspective}
              className="w-full py-1.5 bg-[#20242f] hover:bg-[#2a303e] text-slate-300 rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setTool("perspective-crop")}
            className="w-full py-2 bg-[#20242f] hover:bg-[#2a303e] text-cyan-300 rounded border border-cyan-800/40 font-medium"
          >
            Enable 4-Corner Perspective
          </button>
        )}
      </div>
    </div>
  );
};

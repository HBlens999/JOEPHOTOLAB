import React from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Plus,
  Type,
  Sparkles,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { BlendMode } from "../../types/document";

export const LayersPanel: React.FC = () => {
  const {
    document: doc,
    setActiveLayer,
    addRasterLayer,
    addTextLayer,
    deleteLayer,
    duplicateLayer,
    setLayerVisibility,
    setLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    setLayerAIBlendStrength,
  } = useEditorStore();

  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);

  const blendModes: BlendMode[] = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "soft-light",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
  ];

  const [adjMenuOpen, setAdjMenuOpen] = React.useState(false);

  const adjustmentPresets = [
    { label: "Brightness / Contrast", name: "Brightness/Contrast", preset: { brightness: 10, contrast: 15 } },
    { label: "Exposure", name: "Exposure", preset: { exposure: 0.5 } },
    { label: "Levels", name: "Levels", preset: {} },
    { label: "Curves", name: "Curves", preset: {} },
    { label: "HSL Color", name: "HSL Mixer", preset: {} },
    { label: "Color Balance", name: "Color Balance", preset: {} },
    { label: "Temperature / Tint", name: "White Balance", preset: { temperature: 15, tint: -5 } },
    { label: "Vignette", name: "Vignette", preset: { vignette: { amount: 30, midpoint: 50, roundness: 0, feather: 50 } } },
  ];

  return (
    <div className="flex flex-col h-full bg-[#181a21] text-xs select-none relative">
      {/* Top Header: Blend Mode & Opacity */}
      <div className="p-3 border-b border-[#262934] space-y-2.5 shrink-0 bg-[#15171d]">
        <div className="flex items-center justify-between gap-2">
          {/* Blend Mode Dropdown */}
          <div className="flex-1">
            <label className="text-[10px] text-[#787f90] block mb-1">Blend Mode</label>
            <select
              value={activeLayer?.blendMode || "normal"}
              onChange={(e) => {
                if (activeLayer) setLayerBlendMode(activeLayer.id, e.target.value as BlendMode);
              }}
              disabled={!activeLayer}
              className="w-full bg-[#20232c] border border-[#2f3442] text-white rounded px-2 py-1 text-xs capitalize cursor-pointer focus:outline-none focus:border-cyan-500"
            >
              {blendModes.map((mode) => (
                <option key={mode} value={mode} className="capitalize">
                  {mode.replace("-", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Opacity Slider */}
          <div className="w-28">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-[#787f90]">Opacity</span>
              <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                {activeLayer ? Math.round(activeLayer.opacity * 100) : 100}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={activeLayer?.opacity ?? 1}
              onChange={(e) => {
                if (activeLayer) setLayerOpacity(activeLayer.id, Number(e.target.value));
              }}
              disabled={!activeLayer}
              className="w-full h-1 bg-[#282d3a] accent-cyan-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* If Active Layer is AI Layer, show AI Blend Strength Slider */}
        {activeLayer?.aiMetadata && (
          <div className="bg-[#1c222c] border border-cyan-800/40 rounded p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-medium text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                AI Blend Strength
              </span>
              <span className="text-[11px] font-mono text-cyan-200 tabular-nums">
                {activeLayer.aiMetadata.aiBlendStrength}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={activeLayer.aiMetadata.aiBlendStrength}
              onChange={(e) => setLayerAIBlendStrength(activeLayer.id, Number(e.target.value))}
              className="w-full h-1 bg-[#282d3a] accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Layers Stack List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {doc.layers.map((layer) => {
          const isActive = layer.id === doc.activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border transition-colors ${
                isActive
                  ? "bg-[#252a36] border-cyan-500/60 text-white"
                  : "bg-[#1d2028] border-transparent text-[#9da3b4] hover:bg-[#232731] hover:text-slate-200"
              }`}
            >
              {/* Visibility Eye */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLayerVisibility(layer.id, !layer.visible);
                }}
                className="text-[#767e91] hover:text-white p-0.5"
                title={layer.visible ? "Hide Layer" : "Show Layer"}
              >
                {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {/* Lock Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLayerLock(layer.id, !layer.locked);
                }}
                className="text-[#767e91] hover:text-white p-0.5"
                title={layer.locked ? "Unlock Layer" : "Lock Layer"}
              >
                {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-slate-600" />}
              </button>

              {/* Layer Thumbnail Preview */}
              <div className="w-9 h-6 rounded bg-[#13151b] border border-[#2d3240] overflow-hidden flex items-center justify-center shrink-0">
                {layer.type === "text" ? (
                  <Type className="w-3 h-3 text-rose-400" />
                ) : layer.type === "ai" ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ) : layer.type === "adjustment" ? (
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-700 to-slate-500 opacity-60" />
                )}
              </div>

              {/* Layer Name & Type */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-xs flex items-center gap-1.5">
                  <span className="truncate">{layer.name}</span>
                  {layer.aiMetadata && (
                    <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded shrink-0">
                      AI
                    </span>
                  )}
                  {layer.type === "adjustment" && (
                    <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 rounded shrink-0 font-mono">
                      ADJ
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#71788a] capitalize">
                  {layer.blendMode} · {Math.round(layer.opacity * 100)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjustment Layer Creation Dropdown */}
      {adjMenuOpen && (
        <div className="absolute bottom-12 left-3 bg-[#1e222c] border border-[#2d3342] rounded-lg shadow-2xl py-1 z-50 w-52 text-slate-200">
          <div className="px-3 py-1 text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
            New Adjustment Layer
          </div>
          {adjustmentPresets.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                useEditorStore.getState().addAdjustmentLayer(p.name, p.preset);
                setAdjMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#2b303e] text-xs text-slate-200"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Layer Actions Footer Bar */}
      <div className="h-10 bg-[#15171d] border-t border-[#262934] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => addRasterLayer()}
            className="p-1.5 hover:bg-[#252934] text-[#8d94a5] hover:text-white rounded"
            title="Create New Raster Layer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => addTextLayer()}
            className="p-1.5 hover:bg-[#252934] text-[#8d94a5] hover:text-white rounded"
            title="Create Text Layer"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAdjMenuOpen(!adjMenuOpen)}
            className={`p-1.5 hover:bg-[#252934] rounded transition-colors ${
              adjMenuOpen ? "bg-cyan-950/60 text-cyan-400" : "text-[#8d94a5] hover:text-white"
            }`}
            title="Create Adjustment Layer"
          >
            <Sliders className="w-4 h-4" />
          </button>
          {activeLayer && (
            <button
              onClick={() => duplicateLayer(activeLayer.id)}
              className="p-1.5 hover:bg-[#252934] text-[#8d94a5] hover:text-white rounded"
              title="Duplicate Layer"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        {activeLayer && doc.layers.length > 1 && (
          <button
            onClick={() => deleteLayer(activeLayer.id)}
            className="p-1.5 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded"
            title="Delete Layer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

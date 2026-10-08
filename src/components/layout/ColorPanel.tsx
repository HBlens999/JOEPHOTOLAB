import React from "react";
import { Pipette, RotateCcw } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

const PALETTE = [
  "#000000", "#ffffff", "#7f1d1d", "#ef4444", "#f97316", "#f59e0b",
  "#facc15", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#0ea5e9",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#78350f", "#92400e", "#a16207", "#365314", "#166534", "#115e59",
  "#164e63", "#1e3a8a", "#312e81", "#581c87", "#701a75", "#881337",
];

export const ColorPanel: React.FC = () => {
  const {
    brushSettings,
    setBrushSettings,
    activeTool,
    document: doc,
    updateShapeLayer,
  } = useEditorStore();

  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
  const activeShape = activeLayer?.type === "shape" ? activeLayer : null;

  const applyFill = (color: string) => {
    setBrushSettings({ color });
    if (activeShape) updateShapeLayer(activeShape.id, { fill: color });
  };

  const applyOutline = (color: string) => {
    if (activeShape) {
      updateShapeLayer(activeShape.id, { stroke: color });
    }
  };

  const resetColor = () => {
    setBrushSettings({ color: "#000000" });
    if (activeShape) updateShapeLayer(activeShape.id, { fill: "#000000" });
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-12 z-30 bg-[#151820]/95 border-t border-[#303544] shadow-2xl backdrop-blur-sm flex items-center gap-2 px-3 select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 pr-2 border-r border-[#303544] shrink-0">
        <div
          className="relative w-8 h-8 rounded border border-white/30 shadow"
          style={{ backgroundColor: brushSettings.color }}
          title="Foreground / Fill"
        >
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-black/50 rounded-sm" />
        </div>
        <input
          type="color"
          value={brushSettings.color}
          onChange={(e) => applyFill(e.target.value)}
          className="sr-only"
          id="joe-color-picker"
        />
        <label
          htmlFor="joe-color-picker"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 cursor-pointer"
          title="Custom color"
        >
          <Pipette className="w-4 h-4" />
        </label>
        <button
          type="button"
          onClick={resetColor}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-300"
          title="Reset foreground color to black"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => applyFill(color)}
            onContextMenu={(e) => {
              e.preventDefault();
              applyOutline(color);
            }}
            title={
              activeShape
                ? `Left click: Fill ${color} • Right click: Outline ${color}`
                : `Set color ${color}`
            }
            className="w-6 h-6 rounded-sm border border-white/20 shrink-0 hover:scale-110 hover:border-white transition-transform"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="ml-auto hidden lg:flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
        <span className="text-slate-200 font-medium">COLOR</span>
        {activeShape ? (
          <span>Left = Fill · Right = Outline</span>
        ) : (
          <span>{activeTool === "brush" || activeTool === "eraser" ? "Brush color" : "Foreground color"}</span>
        )}
      </div>
    </div>
  );
};

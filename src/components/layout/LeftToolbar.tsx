import React from "react";
import {
  Move,
  Hand,
  Crop,
  Paintbrush,
  Eraser,
  Stamp,
  Sparkles,
  Type,
  Pipette,
  ZoomIn,
  Square,
  Circle,
  Lasso,
  Wand2,
  Bandage,
  Grid3X3,
  ArrowLeftRight,
  MousePointer2,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { ToolType } from "../../types/document";

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

export const LeftToolbar: React.FC = () => {
  const { activeTool, setTool, brushSettings, setBrushSettings } = useEditorStore();
  const [selectionIndex, setSelectionIndex] = React.useState<0 | 1>(
    activeTool === "marquee-ellipse" ? 1 : 0
  );

  const tools: ToolItem[] = [
    { id: "move", label: "Pick / Move / Transform", shortcut: "V", icon: <Move className="w-4 h-4" /> },
    { id: "pan", label: "Hand / Pan", shortcut: "H", icon: <Hand className="w-4 h-4" /> },
    { id: "shape-rect", label: "Rectangle Shape", shortcut: "U", icon: <Square className="w-4 h-4" /> },
    { id: "shape-ellipse", label: "Ellipse / Circle Shape", shortcut: "Shift+U", icon: <Circle className="w-4 h-4" /> },
    { id: "lasso", label: "Lasso Selection", shortcut: "L", icon: <Lasso className="w-4 h-4" /> },
    { id: "polygonal-lasso", label: "Polygonal Lasso", shortcut: "", icon: <Lasso className="w-4 h-4" /> },
    { id: "magic-wand", label: "Magic Wand", shortcut: "W", icon: <Wand2 className="w-4 h-4" /> },
    { id: "quick-selection", label: "Quick Selection", shortcut: "", icon: <Wand2 className="w-4 h-4" /> },
    { id: "crop", label: "Crop & Straighten", shortcut: "C", icon: <Crop className="w-4 h-4" /> },
    { id: "perspective-crop", label: "Perspective Correction", shortcut: "Shift+C", icon: <Grid3X3 className="w-4 h-4" /> },
    { id: "eyedropper", label: "Eyedropper", shortcut: "I", icon: <Pipette className="w-4 h-4" /> },
    { id: "spot-healing", label: "Spot Healing", shortcut: "J", icon: <Bandage className="w-4 h-4" /> },
    { id: "healing", label: "Healing Brush", shortcut: "Shift+J", icon: <Bandage className="w-4 h-4 text-cyan-400" /> },
    { id: "clone", label: "Clone Stamp", shortcut: "S", icon: <Stamp className="w-4 h-4" /> },
    { id: "brush", label: "Brush", shortcut: "B", icon: <Paintbrush className="w-4 h-4" /> },
    { id: "eraser", label: "Eraser", shortcut: "E", icon: <Eraser className="w-4 h-4" /> },
    { id: "ai-detail-brush", label: "AI Detail Brush", shortcut: "Shift+B", icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: "text", label: "Text Layer", shortcut: "T", icon: <Type className="w-4 h-4" /> },
    { id: "zoom", label: "Zoom View", shortcut: "Z", icon: <ZoomIn className="w-4 h-4" /> },
  ];

  const handleSelectionTool = () => {
    const nextIndex = selectionIndex === 0 ? 1 : 0;
    setSelectionIndex(nextIndex as 0 | 1);
    setTool(nextIndex === 0 ? "marquee-rect" : "marquee-ellipse");
  };

  const handleColorSwap = () => {
    const current = brushSettings.color.toLowerCase();
    const next = current === "#ffffff" ? "#000000" : "#ffffff";
    setBrushSettings({ color: next });
  };

  return (
    <aside className="app-left-toolbar w-12 bg-[#16181f] border-r border-[#252830] flex flex-col items-center py-2 select-none shrink-0 z-20">
      <div className="app-tool-list flex-1 flex flex-col space-y-1 w-full px-1.5 overflow-y-auto no-scrollbar">
        <button
          onClick={handleSelectionTool}
          title="Selection Tool (click to cycle Rectangle / Ellipse; M / Shift+M)"
          aria-label="Selection tool"
          className={"w-9 h-9 rounded flex items-center justify-center transition-all shrink-0 " + (
            activeTool === "marquee-rect" || activeTool === "marquee-ellipse"
              ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "text-[#8d94a5] hover:text-white hover:bg-[#232733]"
          )}
        >
          <MousePointer2 className="w-4 h-4" />
        </button>

        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label + (t.shortcut ? " (" + t.shortcut + ")" : "")}
              aria-label={t.label}
              className={"w-9 h-9 rounded flex items-center justify-center transition-all shrink-0 " + (
                isActive
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm"
                  : "text-[#8d94a5] hover:text-white hover:bg-[#232733]"
              )}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      <div className="app-color-swatch pt-2 border-t border-[#252830] flex flex-col items-center gap-1.5 w-full">
        <div className="relative w-8 h-8 shrink-0">
          <div
            className="absolute top-0 left-0 w-5 h-5 rounded border border-[#3b4150] shadow cursor-pointer z-10"
            style={{ backgroundColor: brushSettings.color }}
            title="Current Painting Color"
          />
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded border border-[#3b4150] bg-black shadow cursor-pointer"
            title="Secondary Background Color"
          />
        </div>
        <button
          onClick={handleColorSwap}
          title="Swap Colors (X)"
          className="text-[#72798c] hover:text-white p-1 rounded shrink-0"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
};

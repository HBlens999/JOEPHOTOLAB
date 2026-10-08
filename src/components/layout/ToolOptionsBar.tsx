import React from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  Paintbrush,
  Sparkles,
  Crop,
  Type,
  Move,
  Stamp,
  Wand2,
  Check,
  X,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";

export const ToolOptionsBar: React.FC = () => {
  const {
    activeTool,
    brushSettings,
    setBrushSettings,
    cloneSettings,
    setCloneSettings,
    document: doc,
    perspectivePoints,
    applyPerspectiveCorrection,
    cancelPerspective,
    selection,
    featherSelection,
    clearSelection,
    updateTextLayer,
    textSettings,
    setTextSettings,
    updateShapeLayer,
  } = useEditorStore();

  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
  const textProps = activeLayer?.textProps ?? textSettings;
  const updateTextProp = (props: Partial<typeof textProps>) => {
    if (activeLayer?.type === "text" && activeLayer.textProps) updateTextLayer(activeLayer.id, props);
    else setTextSettings(props);
  };

  return (
    <div className="app-tooloptions h-9 bg-[#191b22] border-b border-[#252830] flex items-center px-3 text-xs text-[#a6acbc] space-x-4 select-none shrink-0 overflow-x-auto">
      {/* Tool Identification Badge */}
      <div className="flex items-center gap-1.5 text-white font-medium pr-3 border-r border-[#282d38]">
        {activeTool === "brush" && <Paintbrush className="w-3.5 h-3.5 text-cyan-400" />}
        {activeTool === "ai-detail-brush" && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
        {activeTool === "clone" && <Stamp className="w-3.5 h-3.5 text-purple-400" />}
        {activeTool === "magic-wand" && <Wand2 className="w-3.5 h-3.5 text-blue-400" />}
        {activeTool === "crop" && <Crop className="w-3.5 h-3.5 text-emerald-400" />}
        {activeTool === "text" && <Type className="w-3.5 h-3.5 text-rose-400" />}
        {activeTool === "move" && <Move className="w-3.5 h-3.5 text-slate-300" />}
        <span className="capitalize">{activeTool.replace("-", " ")}</span>
      </div>

      {/* Brush / Eraser / AI Detail Brush Controls */}
      {["brush", "eraser", "ai-detail-brush", "healing", "clone", "spot-healing"].includes(
        activeTool
      ) && (
        <div className="flex items-center space-x-4">
          {/* Size */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-[#7a8192]">Size</span>
            <input
              type="range"
              min={1}
              max={300}
              value={brushSettings.size}
              onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
              className="w-20 accent-cyan-500 h-1 bg-[#282d38] rounded cursor-pointer"
            />
            <span className="font-mono text-[11px] w-8 tabular-nums">{brushSettings.size}px</span>
          </div>

          {/* Hardness */}
          {activeTool !== "spot-healing" && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-[#7a8192]">Hardness</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={brushSettings.hardness}
                onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
                className="w-16 accent-cyan-500 h-1 bg-[#282d38] rounded cursor-pointer"
              />
              <span className="font-mono text-[11px] w-7 tabular-nums">
                {Math.round(brushSettings.hardness * 100)}%
              </span>
            </div>
          )}

          {/* Opacity */}
          {["brush", "eraser", "clone", "healing"].includes(activeTool) && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-[#7a8192]">Opacity</span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={brushSettings.opacity}
                onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) })}
                className="w-16 accent-cyan-500 h-1 bg-[#282d38] rounded cursor-pointer"
              />
              <span className="font-mono text-[11px] w-7 tabular-nums">
                {Math.round(brushSettings.opacity * 100)}%
              </span>
            </div>
          )}

          {/* Flow */}
          {["brush", "eraser", "clone"].includes(activeTool) && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-[#7a8192]">Flow</span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={brushSettings.flow}
                onChange={(e) => setBrushSettings({ flow: Number(e.target.value) })}
                className="w-16 accent-cyan-500 h-1 bg-[#282d38] rounded cursor-pointer"
              />
              <span className="font-mono text-[11px] w-7 tabular-nums">
                {Math.round(brushSettings.flow * 100)}%
              </span>
            </div>
          )}

          {/* Color Picker for Brush */}
          {activeTool === "brush" && (
            <div className="flex items-center space-x-1.5 pl-2 border-l border-[#282d38]">
              <span className="text-[11px] text-[#7a8192]">Color</span>
              <input
                type="color"
                value={brushSettings.color}
                onChange={(e) => setBrushSettings({ color: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-[#3b4150] bg-transparent"
              />
            </div>
          )}

          {/* Clone Stamp & Healing Source Controls */}
          {["clone", "healing"].includes(activeTool) && (
            <div className="flex items-center space-x-3 pl-2 border-l border-[#282d38]">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={cloneSettings.aligned}
                  onChange={(e) => setCloneSettings({ aligned: e.target.checked })}
                  className="rounded bg-[#282d38] border-[#3b4150] text-cyan-500 focus:ring-0"
                />
                <span>Aligned</span>
              </label>

              <select
                value={cloneSettings.sampleMode}
                onChange={(e) => setCloneSettings({ sampleMode: e.target.value as any })}
                className="bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-2 py-0.5"
              >
                <option value="current">Current Layer</option>
                <option value="all">All Visible Layers</option>
              </select>

              <span className="text-[10px] text-amber-400">
                {cloneSettings.sourceX !== null ? "Source Locked" : "Alt+Click to set source point"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pick / Move / Transform Options */}
      {activeTool === "move" && activeLayer && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#7a8192]">X</span>
          <input type="number" value={Math.round(activeLayer.x)}
            onChange={(e) => useEditorStore.getState().setLayerTransform(activeLayer.id, Number(e.target.value), activeLayer.y)}
            className="w-16 bg-[#232733] border border-[#343a49] text-white rounded px-1.5 py-1" />
          <span className="text-[11px] text-[#7a8192]">Y</span>
          <input type="number" value={Math.round(activeLayer.y)}
            onChange={(e) => useEditorStore.getState().setLayerTransform(activeLayer.id, activeLayer.x, Number(e.target.value))}
            className="w-16 bg-[#232733] border border-[#343a49] text-white rounded px-1.5 py-1" />
          <span className="text-[11px] text-[#7a8192]">W</span>
          <input type="number" min="1" value={Math.round(activeLayer.width)}
            onChange={(e) => useEditorStore.getState().setLayerTransform(activeLayer.id, activeLayer.x, activeLayer.y, Math.max(1, Number(e.target.value)), activeLayer.height)}
            className="w-16 bg-[#232733] border border-[#343a49] text-white rounded px-1.5 py-1" />
          <span className="text-[11px] text-[#7a8192]">H</span>
          <input type="number" min="1" value={Math.round(activeLayer.height)}
            onChange={(e) => useEditorStore.getState().setLayerTransform(activeLayer.id, activeLayer.x, activeLayer.y, activeLayer.width, Math.max(1, Number(e.target.value)))}
            className="w-16 bg-[#232733] border border-[#343a49] text-white rounded px-1.5 py-1" />
          <span className="text-[11px] text-[#7a8192]">Opacity</span>
          <input type="range" min="0" max="1" step="0.01" value={activeLayer.opacity}
            onChange={(e) => useEditorStore.getState().setLayerOpacity(activeLayer.id, Number(e.target.value))}
            className="w-16 accent-cyan-500" />
          <span className="text-[11px] text-[#7a8192]">Rotation</span>
          <input type="number" value={Math.round(activeLayer.rotation)}
            onChange={(e) => useEditorStore.getState().setLayerTransform(activeLayer.id, activeLayer.x, activeLayer.y, activeLayer.width, activeLayer.height, Number(e.target.value))}
            className="w-14 bg-[#232733] border border-[#343a49] text-white rounded px-1.5 py-1" />
        </div>
      )}

      {/* Shape Tool Options */}
      {(["shape-rect", "shape-ellipse"].includes(activeTool) || activeLayer?.type === "shape") && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#7a8192]">Fill</span>
          <input
            type="color"
            value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.fill || "#ffffff" : "#ffffff"}
            onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { fill: e.target.value })}
            className="w-6 h-6 rounded border border-[#343a49] bg-transparent cursor-pointer"
            title="Fill color"
          />
          <span className="text-[11px] text-[#7a8192]">Fill opacity</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.fillOpacity ?? 1 : 1}
            onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { fillOpacity: Number(e.target.value) })}
            className="w-16 accent-cyan-500"
          />
          <span className="text-[11px] text-[#7a8192]">Outline</span>
          <input
            type="color"
            value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.stroke || "#000000" : "#000000"}
            onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { stroke: e.target.value })}
            className="w-6 h-6 rounded border border-[#343a49] bg-transparent cursor-pointer"
            title="Outline color"
          />
          <span className="text-[11px] text-[#7a8192]">Width</span>
          <input
            type="number" min="0" max="100"
            value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.strokeWidth ?? 2 : 2}
            onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { strokeWidth: Math.max(0, Number(e.target.value) || 0) })}
            className="w-14 bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-1.5 py-1"
          />
          <span className="text-[11px] text-[#7a8192]">Outline opacity</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.strokeOpacity ?? 1 : 1}
            onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { strokeOpacity: Number(e.target.value) })}
            className="w-16 accent-cyan-500"
          />
          <span className="text-[11px] text-[#7a8192]">Shape opacity</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={activeLayer?.type === "shape" ? activeLayer.opacity : 1}
            onChange={(e) => activeLayer?.type === "shape" && useEditorStore.getState().setLayerOpacity(activeLayer.id, Number(e.target.value))}
            className="w-16 accent-cyan-500"
            title="Overall shape opacity"
          />
          {activeLayer?.type === "shape" && activeLayer.shapeProps?.kind === "rectangle" && (
            <>
              <span className="text-[11px] text-[#7a8192]">Radius</span>
              <input
                type="number" min="0" max="500"
                value={activeLayer?.type === "shape" ? activeLayer.shapeProps?.cornerRadius ?? 0 : 0}
                onChange={(e) => activeLayer?.type === "shape" && updateShapeLayer(activeLayer.id, { cornerRadius: Math.max(0, Number(e.target.value) || 0) })}
                className="w-14 bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-1.5 py-1"
              />
            </>
          )}
        </div>
      )}

      {/* Perspective Homography Controls */}
      {activeTool === "perspective-crop" && perspectivePoints && (
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-cyan-300">
            Drag 4 corners to correct architectural perspective & converging angles
          </span>
          <button
            onClick={applyPerspectiveCorrection}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px]"
          >
            <Check className="w-3 h-3" />
            <span>Apply Homography</span>
          </button>
          <button
            onClick={cancelPerspective}
            className="flex items-center gap-1 px-2.5 py-0.5 bg-[#2d323f] hover:bg-[#393f4e] text-white rounded text-[11px]"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Selection Tool Options */}
      {["marquee-rect", "marquee-ellipse", "lasso", "magic-wand"].includes(activeTool) && (
        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-[#7a8192]">Feather</span>
          <button
            onClick={() => featherSelection(2)}
            className="px-2 py-0.5 bg-[#252934] hover:bg-[#2f3544] text-[11px] rounded"
          >
            2px
          </button>
          <button
            onClick={() => featherSelection(8)}
            className="px-2 py-0.5 bg-[#252934] hover:bg-[#2f3544] text-[11px] rounded"
          >
            8px
          </button>
          {selection.active && (
            <button
              onClick={clearSelection}
              className="px-2 py-0.5 bg-[#3b2b2b] hover:bg-[#4d3535] text-rose-300 text-[11px] rounded"
            >
              Deselect
            </button>
          )}
        </div>
      )}

      {/* Text Tool Options */}
      {activeTool === "text" && (
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#7a8192]">Font</span>
          <select
            value={textProps.fontFamily}
            onChange={(e) => updateTextProp({ fontFamily: e.target.value })}
            className="w-36 bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-2 py-1"
          >
            <option>Plus Jakarta Sans</option>
            <option>Arial</option>
            <option>Georgia</option>
            <option>Times New Roman</option>
            <option>Courier New</option>
            <option>Verdana</option>
          </select>
          <span className="text-[11px] text-[#7a8192]">Size</span>
          <input
            type="number"
            min={8}
            max={500}
            value={textProps.fontSize}
            onChange={(e) => updateTextProp({ fontSize: Math.max(8, Number(e.target.value) || 8) })}
            className="w-16 bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-1.5 py-1 font-mono"
          />
          <input
            type="color"
            value={textProps.fill}
            onChange={(e) => updateTextProp({ fill: e.target.value })}
            title="Text color"
            className="w-6 h-6 rounded border border-[#343a49] bg-transparent cursor-pointer"
          />
          <button
            onClick={() => updateTextProp({ fontWeight: textProps.fontWeight === "bold" ? "normal" : "bold" })}
            className={`px-2 py-1 rounded font-bold ${textProps.fontWeight === "bold" ? "bg-cyan-600 text-white" : "bg-[#232733] text-slate-300"}`}
            title="Bold"
          >B</button>
          <button
            onClick={() => updateTextProp({ fontStyle: textProps.fontStyle === "italic" ? "normal" : "italic" })}
            className={`px-2 py-1 rounded italic ${textProps.fontStyle === "italic" ? "bg-cyan-600 text-white" : "bg-[#232733] text-slate-300"}`}
            title="Italic"
          >I</button>
          <select
            value={textProps.align}
            onChange={(e) => updateTextProp({ align: e.target.value as "left" | "center" | "right" })}
            className="bg-[#232733] border border-[#343a49] text-[11px] text-white rounded px-2 py-1"
            title="Text alignment"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      )}

    </div>
  );
};

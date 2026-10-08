import React, { useState, useMemo } from "react";
import { useEditorStore } from "../../store/editorStore";
import { getDefaultAdjustments, CurvePoint } from "../../types/document";
import { computeHistogram } from "../../engine/histogram";

export const AdjustmentsPanel: React.FC = () => {
  const { document: doc, updateActiveLayerAdjustments } = useEditorStore();
  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
  const adjustments = activeLayer?.adjustments || getDefaultAdjustments();

  const [activeSubTab, setActiveSubTab] = useState<
    "basic" | "levels" | "curves" | "hsl" | "colorBalance" | "effects"
  >("basic");

  // Curves & Levels Channel Selection
  const [curveChannel, setCurveChannel] = useState<"rgb" | "red" | "green" | "blue">("rgb");
  const [levelsChannel, setLevelsChannel] = useState<"rgb" | "red" | "green" | "blue">("rgb");

  // HSL Active Range
  const [hslRange, setHslRange] = useState<
    "master" | "reds" | "oranges" | "yellows" | "greens" | "aquas" | "blues" | "purples" | "magentas"
  >("master");

  // Color Balance Active Range
  const [cbTonal, setCbTonal] = useState<"shadows" | "midtones" | "highlights">("midtones");

  // Compute Histogram for active layer canvas
  const histogram = useMemo(() => {
    if (!activeLayer?.canvas) return null;
    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return null;
    const imgData = ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
    return computeHistogram(imgData);
  }, [activeLayer?.canvas]);

  const handleCurveClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const yNorm = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));

    const currentPoints = [...adjustments.curves[curveChannel]];
    // Don't add duplicate x
    if (!currentPoints.some((p) => Math.abs(p.x - xNorm) < 6)) {
      currentPoints.push({ x: xNorm, y: yNorm });
      currentPoints.sort((a, b) => a.x - b.x);
      updateActiveLayerAdjustments({
        curves: {
          ...adjustments.curves,
          [curveChannel]: currentPoints,
        },
      });
    }
  };

  const resetCurrentCurve = () => {
    updateActiveLayerAdjustments({
      curves: {
        ...adjustments.curves,
        [curveChannel]: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      },
    });
  };

  if (!activeLayer) {
    return (
      <div className="p-4 text-center text-xs text-[#737a8c]">
        Select a layer to view and edit non-destructive adjustments.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#181a21] text-xs select-none overflow-y-auto">
      {/* Sub Navigation Tabs */}
      <div className="grid grid-cols-6 border-b border-[#252834] bg-[#14161c] text-[10px] text-[#8e95a7] shrink-0">
        {[
          { id: "basic", label: "Basic" },
          { id: "levels", label: "Levels" },
          { id: "curves", label: "Curves" },
          { id: "hsl", label: "HSL" },
          { id: "colorBalance", label: "Color" },
          { id: "effects", label: "FX" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-2 text-center transition-colors font-medium border-b-2 ${
              activeSubTab === tab.id
                ? "border-cyan-500 text-white bg-[#1a1d25]"
                : "border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-4">
        {/* BASIC TAB */}
        {activeSubTab === "basic" && (
          <div className="space-y-3">
            {/* Exposure */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Exposure</span>
                <span className="font-mono text-slate-200">{adjustments.exposure > 0 ? `+${adjustments.exposure.toFixed(2)}` : adjustments.exposure.toFixed(2)} EV</span>
              </div>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.05}
                value={adjustments.exposure}
                onChange={(e) => updateActiveLayerAdjustments({ exposure: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Brightness</span>
                <span className="font-mono text-slate-200">{adjustments.brightness}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.brightness}
                onChange={(e) => updateActiveLayerAdjustments({ brightness: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Contrast</span>
                <span className="font-mono text-slate-200">{adjustments.contrast}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.contrast}
                onChange={(e) => updateActiveLayerAdjustments({ contrast: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Highlights */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Highlights</span>
                <span className="font-mono text-slate-200">{adjustments.highlights}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.highlights}
                onChange={(e) => updateActiveLayerAdjustments({ highlights: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Shadows */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Shadows</span>
                <span className="font-mono text-slate-200">{adjustments.shadows}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.shadows}
                onChange={(e) => updateActiveLayerAdjustments({ shadows: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Temperature (Cool ↔ Warm)</span>
                <span className="font-mono text-slate-200">{adjustments.temperature}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.temperature}
                onChange={(e) => updateActiveLayerAdjustments({ temperature: Number(e.target.value) })}
                className="w-full h-1 bg-gradient-to-r from-blue-600 via-slate-600 to-amber-500 accent-amber-400 rounded cursor-pointer"
              />
            </div>

            {/* Tint */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Tint (Green ↔ Magenta)</span>
                <span className="font-mono text-slate-200">{adjustments.tint}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.tint}
                onChange={(e) => updateActiveLayerAdjustments({ tint: Number(e.target.value) })}
                className="w-full h-1 bg-gradient-to-r from-emerald-600 via-slate-600 to-fuchsia-600 accent-fuchsia-400 rounded cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Saturation</span>
                <span className="font-mono text-slate-200">{adjustments.saturation}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.saturation}
                onChange={(e) => updateActiveLayerAdjustments({ saturation: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* Vibrance */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Vibrance</span>
                <span className="font-mono text-slate-200">{adjustments.vibrance}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.vibrance}
                onChange={(e) => updateActiveLayerAdjustments({ vibrance: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* LEVELS TAB */}
        {activeSubTab === "levels" && (
          <div className="space-y-4">
            {/* Channel Selector */}
            <div className="flex bg-[#12141a] p-1 rounded gap-1">
              {(["rgb", "red", "green", "blue"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setLevelsChannel(ch)}
                  className={`flex-1 py-1 rounded text-[10px] uppercase font-semibold transition-colors ${
                    levelsChannel === ch
                      ? "bg-[#282d3a] text-white shadow-sm"
                      : "text-[#7a8192] hover:text-white"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Histogram Graphic with Input Levels Marker */}
            <div className="relative h-28 bg-[#12141a] border border-[#2b303e] rounded overflow-hidden">
              {histogram && (
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 256 100">
                  <path
                    d={`M 0 100 ${Array.from(histogram.luminance)
                      .map((val, idx) => `L ${idx} ${100 - (val / histogram.max) * 95}`)
                      .join(" ")} L 255 100 Z`}
                    fill="rgba(148, 163, 184, 0.25)"
                  />
                </svg>
              )}
            </div>

            {/* Black Point */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Shadows (Black Point)</span>
                <span className="font-mono text-slate-200">{adjustments.levels[levelsChannel].black}</span>
              </div>
              <input
                type="range"
                min={0}
                max={254}
                value={adjustments.levels[levelsChannel].black}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    levels: {
                      ...adjustments.levels,
                      [levelsChannel]: { ...adjustments.levels[levelsChannel], black: val },
                    },
                  });
                }}
                className="w-full h-1 bg-[#282d38] accent-slate-300 rounded cursor-pointer"
              />
            </div>

            {/* Midtones Gamma */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Midtones (Gamma)</span>
                <span className="font-mono text-slate-200">{adjustments.levels[levelsChannel].gamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={5.0}
                step={0.05}
                value={adjustments.levels[levelsChannel].gamma}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    levels: {
                      ...adjustments.levels,
                      [levelsChannel]: { ...adjustments.levels[levelsChannel], gamma: val },
                    },
                  });
                }}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {/* White Point */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Highlights (White Point)</span>
                <span className="font-mono text-slate-200">{adjustments.levels[levelsChannel].white}</span>
              </div>
              <input
                type="range"
                min={1}
                max={255}
                value={adjustments.levels[levelsChannel].white}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    levels: {
                      ...adjustments.levels,
                      [levelsChannel]: { ...adjustments.levels[levelsChannel], white: val },
                    },
                  });
                }}
                className="w-full h-1 bg-[#282d38] accent-slate-300 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* CURVES TAB */}
        {activeSubTab === "curves" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex bg-[#12141a] p-1 rounded gap-1">
                {(["rgb", "red", "green", "blue"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setCurveChannel(ch)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors ${
                      curveChannel === ch
                        ? "bg-[#282d3a] text-white shadow-sm"
                        : "text-[#7a8192] hover:text-white"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <button
                onClick={resetCurrentCurve}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-[#20242f]"
              >
                Reset
              </button>
            </div>

            {/* Interactive 256x256 SVG Curve Editor */}
            <div className="relative w-full aspect-square bg-[#12141a] border border-[#2b303e] rounded overflow-hidden cursor-crosshair">
              {/* Grid 4x4 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#fff" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#fff" />
                <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#fff" />
                <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#fff" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#fff" />
                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#fff" />
              </svg>

              {/* Histogram underlay */}
              {histogram && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 256 256" preserveAspectRatio="none">
                  <path
                    d={`M 0 256 ${Array.from(histogram.luminance)
                      .map((val, idx) => `L ${idx} ${256 - (val / histogram.max) * 240}`)
                      .join(" ")} L 255 256 Z`}
                    fill="#94a3b8"
                  />
                </svg>
              )}

              {/* Interactive SVG Curve Spline */}
              <svg
                className="w-full h-full relative z-10"
                viewBox="0 0 256 256"
                onClick={handleCurveClick}
              >
                {/* Spline Path */}
                <polyline
                  points={adjustments.curves[curveChannel].map((p) => `${p.x},${256 - p.y}`).join(" ")}
                  fill="none"
                  stroke={
                    curveChannel === "red"
                      ? "#ef4444"
                      : curveChannel === "green"
                      ? "#10b981"
                      : curveChannel === "blue"
                      ? "#3b82f6"
                      : "#ffffff"
                  }
                  strokeWidth="2"
                />

                {/* Control Points */}
                {adjustments.curves[curveChannel].map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={256 - p.y}
                    r="4"
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    className="cursor-move hover:scale-125"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const svg = e.currentTarget.ownerSVGElement!;
                      const startPt = { ...p };

                      const handleMove = (ev: PointerEvent) => {
                        const rect = svg.getBoundingClientRect();
                        const nx = Math.max(0, Math.min(255, Math.round(((ev.clientX - rect.left) / rect.width) * 255)));
                        const ny = Math.max(0, Math.min(255, Math.round((1 - (ev.clientY - rect.top) / rect.height) * 255)));

                        const pts = [...adjustments.curves[curveChannel]];
                        pts[idx] = { x: nx, y: ny };
                        pts.sort((a, b) => a.x - b.x);
                        updateActiveLayerAdjustments({
                          curves: { ...adjustments.curves, [curveChannel]: pts },
                        });
                      };

                      const handleUp = () => {
                        window.removeEventListener("pointermove", handleMove);
                        window.removeEventListener("pointerup", handleUp);
                      };

                      window.addEventListener("pointermove", handleMove);
                      window.addEventListener("pointerup", handleUp);
                    }}
                  />
                ))}
              </svg>
            </div>
            <div className="text-[10px] text-[#787f90] text-center">
              Click anywhere on curve to add control points. Drag points to adjust tonal distribution.
            </div>
          </div>
        )}

        {/* HSL TAB */}
        {activeSubTab === "hsl" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-1 bg-[#12141a] p-1 rounded text-[10px]">
              {(["master", "reds", "oranges", "yellows", "greens", "aquas", "blues", "purples", "magentas"] as const).map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => setHslRange(range)}
                    className={`py-1 rounded capitalize font-medium ${
                      hslRange === range ? "bg-[#282d3a] text-white" : "text-[#7a8192] hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                )
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Hue Shift</span>
                <span className="font-mono text-slate-200">{adjustments.hsl[hslRange].hue}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={adjustments.hsl[hslRange].hue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    hsl: {
                      ...adjustments.hsl,
                      [hslRange]: { ...adjustments.hsl[hslRange], hue: val },
                    },
                  });
                }}
                className="w-full h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Saturation</span>
                <span className="font-mono text-slate-200">{adjustments.hsl[hslRange].sat}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.hsl[hslRange].sat}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    hsl: {
                      ...adjustments.hsl,
                      [hslRange]: { ...adjustments.hsl[hslRange], sat: val },
                    },
                  });
                }}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Luminance</span>
                <span className="font-mono text-slate-200">{adjustments.hsl[hslRange].lum}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.hsl[hslRange].lum}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    hsl: {
                      ...adjustments.hsl,
                      [hslRange]: { ...adjustments.hsl[hslRange], lum: val },
                    },
                  });
                }}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* COLOR BALANCE TAB */}
        {activeSubTab === "colorBalance" && (
          <div className="space-y-4">
            <div className="flex bg-[#12141a] p-1 rounded gap-1">
              {(["shadows", "midtones", "highlights"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCbTonal(t)}
                  className={`flex-1 py-1 rounded text-[10px] capitalize font-medium ${
                    cbTonal === t ? "bg-[#282d3a] text-white" : "text-[#7a8192] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-cyan-400">Cyan</span>
                <span className="font-mono text-slate-200">{adjustments.colorBalance[cbTonal].cyanRed}</span>
                <span className="text-rose-400">Red</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.colorBalance[cbTonal].cyanRed}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    colorBalance: {
                      ...adjustments.colorBalance,
                      [cbTonal]: { ...adjustments.colorBalance[cbTonal], cyanRed: val },
                    },
                  });
                }}
                className="w-full h-1 bg-gradient-to-r from-cyan-600 to-rose-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-fuchsia-400">Magenta</span>
                <span className="font-mono text-slate-200">{adjustments.colorBalance[cbTonal].magentaGreen}</span>
                <span className="text-emerald-400">Green</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.colorBalance[cbTonal].magentaGreen}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    colorBalance: {
                      ...adjustments.colorBalance,
                      [cbTonal]: { ...adjustments.colorBalance[cbTonal], magentaGreen: val },
                    },
                  });
                }}
                className="w-full h-1 bg-gradient-to-r from-fuchsia-600 to-emerald-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-amber-400">Yellow</span>
                <span className="font-mono text-slate-200">{adjustments.colorBalance[cbTonal].yellowBlue}</span>
                <span className="text-blue-400">Blue</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.colorBalance[cbTonal].yellowBlue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateActiveLayerAdjustments({
                    colorBalance: {
                      ...adjustments.colorBalance,
                      [cbTonal]: { ...adjustments.colorBalance[cbTonal], yellowBlue: val },
                    },
                  });
                }}
                className="w-full h-1 bg-gradient-to-r from-amber-500 to-blue-600 rounded cursor-pointer"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={adjustments.colorBalance.preserveLuminosity}
                onChange={(e) =>
                  updateActiveLayerAdjustments({
                    colorBalance: {
                      ...adjustments.colorBalance,
                      preserveLuminosity: e.target.checked,
                    },
                  })
                }
                className="rounded bg-[#282d38] border-[#3b4150] text-cyan-500 focus:ring-0"
              />
              <span className="text-[11px] text-[#a5acbe]">Preserve Luminosity</span>
            </label>
          </div>
        )}

        {/* EFFECTS TAB (Sharpen, Blur, Vignette) */}
        {activeSubTab === "effects" && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Sharpen</span>
                <span className="font-mono text-slate-200">{adjustments.sharpness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={adjustments.sharpness}
                onChange={(e) => updateActiveLayerAdjustments({ sharpness: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Noise Reduction</span>
                <span className="font-mono text-slate-200">{adjustments.noiseReduction}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={adjustments.noiseReduction}
                onChange={(e) => updateActiveLayerAdjustments({ noiseReduction: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Gaussian Blur</span>
                <span className="font-mono text-slate-200">{adjustments.blur}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={adjustments.blur}
                onChange={(e) => updateActiveLayerAdjustments({ blur: Number(e.target.value) })}
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#8e95a7]">Vignette Amount</span>
                <span className="font-mono text-slate-200">{adjustments.vignette.amount}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={adjustments.vignette.amount}
                onChange={(e) =>
                  updateActiveLayerAdjustments({
                    vignette: { ...adjustments.vignette, amount: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

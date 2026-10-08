import React from "react";
import { Camera, Sliders, Sun, Aperture, Eye } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const RAWPanel: React.FC = () => {
  const { document: doc, updateRAWAdjustments } = useEditorStore();
  const rawMeta = doc.rawMetadata;
  const rawAdj = doc.rawAdjustments || {
    exposure: 0,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    contrast: 0,
    clarity: 0,
    dehaze: 0,
    vibrance: 0,
    saturation: 0,
    sharpening: 25,
    noiseReduction: 15,
  };

  return (
    <div className="flex flex-col h-full bg-[#181a21] text-xs select-none overflow-y-auto p-3 space-y-5">
      {/* Camera EXIF Metadata Card */}
      <div className="bg-[#14161c] border border-[#272a36] rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white flex items-center gap-1.5 text-xs">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            {rawMeta?.cameraMake || "Digital Camera"} {rawMeta?.cameraModel || ""}
          </span>
          <span className="text-[10px] bg-cyan-950/70 border border-cyan-800/40 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
            RAW
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8e95a7] font-mono tabular-nums">
          <div>
            <span className="text-[#646b7d] block text-[10px]">ISO</span>
            <span className="text-white">{rawMeta?.iso ?? 100}</span>
          </div>
          <div>
            <span className="text-[#646b7d] block text-[10px]">Shutter Speed</span>
            <span className="text-white">{rawMeta?.shutterSpeed || "1/250s"}</span>
          </div>
          <div>
            <span className="text-[#646b7d] block text-[10px]">Aperture</span>
            <span className="text-white">{rawMeta?.aperture || "f/2.8"}</span>
          </div>
          <div>
            <span className="text-[#646b7d] block text-[10px]">Focal Length</span>
            <span className="text-white">{rawMeta?.focalLength || "50mm"}</span>
          </div>
        </div>
      </div>

      {/* RAW Development Sliders */}
      <div className="space-y-4">
        <span className="font-semibold text-slate-200 block border-b border-[#252834] pb-1.5">
          Linear Sensor Development
        </span>

        {/* Exposure EV */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Exposure</span>
            <span className="font-mono text-slate-200">
              {rawAdj.exposure > 0 ? `+${rawAdj.exposure.toFixed(2)}` : rawAdj.exposure.toFixed(2)} EV
            </span>
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.05}
            value={rawAdj.exposure}
            onChange={(e) => updateRAWAdjustments({ exposure: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">White Balance Temp</span>
            <span className="font-mono text-slate-200">{rawAdj.temperature}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.temperature}
            onChange={(e) => updateRAWAdjustments({ temperature: Number(e.target.value) })}
            className="w-full h-1 bg-gradient-to-r from-blue-600 via-slate-600 to-amber-500 rounded cursor-pointer"
          />
        </div>

        {/* Tint */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Tint</span>
            <span className="font-mono text-slate-200">{rawAdj.tint}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.tint}
            onChange={(e) => updateRAWAdjustments({ tint: Number(e.target.value) })}
            className="w-full h-1 bg-gradient-to-r from-emerald-600 via-slate-600 to-fuchsia-600 rounded cursor-pointer"
          />
        </div>

        {/* Highlights */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Highlight Recovery</span>
            <span className="font-mono text-slate-200">{rawAdj.highlights}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.highlights}
            onChange={(e) => updateRAWAdjustments({ highlights: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Shadows */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Shadow Recovery</span>
            <span className="font-mono text-slate-200">{rawAdj.shadows}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.shadows}
            onChange={(e) => updateRAWAdjustments({ shadows: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Contrast</span>
            <span className="font-mono text-slate-200">{rawAdj.contrast}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.contrast}
            onChange={(e) => updateRAWAdjustments({ contrast: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Clarity */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Clarity</span>
            <span className="font-mono text-slate-200">{rawAdj.clarity}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.clarity}
            onChange={(e) => updateRAWAdjustments({ clarity: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Dehaze */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Dehaze</span>
            <span className="font-mono text-slate-200">{rawAdj.dehaze}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={rawAdj.dehaze}
            onChange={(e) => updateRAWAdjustments({ dehaze: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>

        {/* Sharpening */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-[#8e95a7]">Raw Demosaic Sharpening</span>
            <span className="font-mono text-slate-200">{rawAdj.sharpening}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={rawAdj.sharpening}
            onChange={(e) => updateRAWAdjustments({ sharpening: Number(e.target.value) })}
            className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

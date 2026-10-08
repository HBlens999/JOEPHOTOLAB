import React, { useState } from "react";
import {
  Sparkles,
  Sun,
  Paintbrush,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const AIEnginePanel: React.FC = () => {
  const {
    document: doc,
    currentAIJob,
    startAITextureSynthesis,
    startAIRelighting,
    startAIDetailPaint,
    startAISmartSelection,
    selection,
    setTool,
  } = useEditorStore();

  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);

  // Micro-Texture Synthesis State
  const [textureType, setTextureType] = useState<
    "Skin Pores" | "Fabric Weave" | "Hair / Beard Detail" | "Metallic Gloss" | "Natural Vegetation" | "Custom"
  >("Skin Pores");
  const [detailFidelity, setDetailFidelity] = useState(85);
  const [denoiseThreshold, setDenoiseThreshold] = useState(20);
  const [customPrompt, setCustomPrompt] = useState("");

  // Relighting State
  const [lightDirectionAngle, setLightDirectionAngle] = useState(45);
  const [highlightIntensity, setHighlightIntensity] = useState(65);
  const [lightSoftness, setLightSoftness] = useState(50);
  const [colorTemperature, setColorTemperature] = useState(15);
  const [rimLightStrength, setRimLightStrength] = useState(40);
  const [catchlightEnhancer, setCatchlightEnhancer] = useState(true);
  const [shadowPreservation, setShadowPreservation] = useState(75);

  // Detail Paint State
  const [materialTarget, setMaterialTarget] = useState("skin/hair");
  const [detailPrompt, setDetailPrompt] = useState("Enhance micro-textures, specular clarity and sharpness");

  const isJobRunning = currentAIJob?.status === "processing" || currentAIJob?.status === "queued";

  return (
    <div className="flex flex-col h-full bg-[#181a21] text-xs select-none overflow-y-auto">
      {/* Header Banner */}
      <div className="p-3 border-b border-[#252834] bg-gradient-to-r from-blue-950/40 via-[#181a21] to-cyan-950/40">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Joephotolab AI Engine</span>
        </div>
        <p className="text-[11px] text-[#8e95a7] mt-0.5">
          Server-side neural micro-texture synthesis, studio relighting, and smart segmentation.
        </p>
      </div>

      {/* Global AI Job Running HUD */}
      {currentAIJob && (
        <div className="m-3 p-3 rounded-lg border border-cyan-800/50 bg-[#151c27] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-cyan-300 flex items-center gap-1.5 text-xs">
              {currentAIJob.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : currentAIJob.status === "failed" ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              )}
              {currentAIJob.type}
            </span>
            <span className="font-mono text-[11px] text-cyan-400 font-semibold tabular-nums">
              {currentAIJob.progress}%
            </span>
          </div>

          <div className="w-full bg-[#20293a] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${currentAIJob.progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="capitalize">{currentAIJob.status}</span>
            {currentAIJob.error && <span className="text-rose-400 truncate max-w-[200px]">{currentAIJob.error}</span>}
          </div>
        </div>
      )}

      <div className="p-3 space-y-6">
        {/* SECTION 1: 8K NEURAL MICRO-TEXTURE SYNTHESIS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#252834] pb-1.5">
            <span className="font-semibold text-slate-200">8K Micro-Texture Synthesis</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
              Neural Upscale
            </span>
          </div>

          {/* Micro-Texture Type Chips */}
          <div>
            <label className="text-[11px] text-[#8e95a7] block mb-1.5">Micro-Texture Preset</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  "Skin Pores",
                  "Fabric Weave",
                  "Hair / Beard Detail",
                  "Metallic Gloss",
                  "Natural Vegetation",
                  "Custom",
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => setTextureType(type)}
                  className={`px-2 py-1.5 rounded text-left text-[11px] transition-all border ${
                    textureType === type
                      ? "bg-cyan-950/60 border-cyan-500 text-cyan-200 font-medium"
                      : "bg-[#1f222b] border-transparent text-[#8e95a7] hover:bg-[#252934] hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {textureType === "Custom" && (
            <div>
              <label className="text-[11px] text-[#8e95a7] block mb-1">Custom Synthesis Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Synthesize carbon fiber twill weave with specular sheen..."
                className="w-full bg-[#13151c] border border-[#2d3240] rounded p-2 text-xs text-white placeholder-slate-500 h-16 resize-none focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Detail Fidelity Slider */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#8e95a7]">Detail Fidelity</span>
              <span className="font-mono text-slate-200">{detailFidelity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={detailFidelity}
              onChange={(e) => setDetailFidelity(Number(e.target.value))}
              className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Denoise Threshold Slider */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#8e95a7]">Denoise Threshold</span>
              <span className="font-mono text-slate-200">{denoiseThreshold}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={denoiseThreshold}
              onChange={(e) => setDenoiseThreshold(Number(e.target.value))}
              className="w-full h-1 bg-[#282d38] accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          <button
            onClick={() =>
              startAITextureSynthesis({
                textureType,
                detailFidelity,
                denoiseThreshold,
                customPrompt: textureType === "Custom" ? customPrompt : undefined,
              })
            }
            disabled={isJobRunning || !activeLayer}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded font-medium shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Synthesize 8K Textures</span>
          </button>
        </div>

        {/* SECTION 2: DYNAMIC STUDIO RELIGHTING */}
        <div className="space-y-3 pt-4 border-t border-[#252834]">
          <div className="flex items-center justify-between border-b border-[#252834] pb-1.5">
            <span className="font-semibold text-slate-200">Dynamic Studio Relighting</span>
            <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
              Key & Rim
            </span>
          </div>

          {/* Interactive Light Direction Dial */}
          <div className="flex items-center gap-4 bg-[#14161c] p-2.5 rounded border border-[#262934]">
            <div
              className="relative w-16 h-16 rounded-full border-2 border-[#333a4a] bg-[#1a1d25] flex items-center justify-center cursor-pointer shadow-inner shrink-0"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const angle = Math.round(
                  (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90
                );
                setLightDirectionAngle((angle + 360) % 360);
              }}
            >
              <div
                className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-md"
                style={{
                  transform: `rotate(${lightDirectionAngle - 90}deg) translate(24px)`,
                }}
              />
              <Sun className="w-5 h-5 text-amber-400/80" />
            </div>

            <div className="flex-1">
              <span className="text-[11px] text-[#8e95a7] block">Light Direction</span>
              <span className="text-sm font-semibold font-mono text-white tabular-nums">
                {lightDirectionAngle}°
              </span>
              <span className="text-[10px] text-slate-400 block">Click wheel to rotate key light</span>
            </div>
          </div>

          {/* Highlight Intensity */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#8e95a7]">Highlight Intensity</span>
              <span className="font-mono text-slate-200">{highlightIntensity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={highlightIntensity}
              onChange={(e) => setHighlightIntensity(Number(e.target.value))}
              className="w-full h-1 bg-[#282d38] accent-amber-400 rounded cursor-pointer"
            />
          </div>

          {/* Rim Light Strength */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#8e95a7]">Rim Light Strength</span>
              <span className="font-mono text-slate-200">{rimLightStrength}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={rimLightStrength}
              onChange={(e) => setRimLightStrength(Number(e.target.value))}
              className="w-full h-1 bg-[#282d38] accent-cyan-400 rounded cursor-pointer"
            />
          </div>

          {/* Catchlight Enhancer */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={catchlightEnhancer}
              onChange={(e) => setCatchlightEnhancer(e.target.checked)}
              className="rounded bg-[#282d38] border-[#3b4150] text-amber-500 focus:ring-0"
            />
            <span className="text-[11px] text-[#a5acbe]">Eye Catchlight Enhancer</span>
          </label>

          <button
            onClick={() =>
              startAIRelighting({
                lightDirectionAngle,
                highlightIntensity,
                lightSoftness,
                colorTemperature,
                rimLightStrength,
                catchlightEnhancer,
                shadowPreservation,
              })
            }
            disabled={isJobRunning || !activeLayer}
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded font-medium shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Apply Studio Lighting & Rim Light</span>
          </button>
        </div>

        {/* SECTION 3: AI DETAIL PAINT */}
        <div className="space-y-3 pt-4 border-t border-[#252834]">
          <div className="flex items-center justify-between border-b border-[#252834] pb-1.5">
            <span className="font-semibold text-slate-200">AI Detail Paint</span>
            <span className="text-[10px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
              Brush Inpainting
            </span>
          </div>

          <p className="text-[11px] text-[#8e95a7]">
            Select the <strong>AI Detail Brush</strong>, paint over blemishes, hair strands, fabric, or skin, then synthesize micro-details.
          </p>

          <button
            onClick={() => setTool("ai-detail-brush")}
            className="w-full py-1.5 bg-[#202430] hover:bg-[#282e3d] text-cyan-300 rounded border border-cyan-800/40 flex items-center justify-center gap-1.5"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Activate AI Detail Brush</span>
          </button>

          {selection.active && (
            <button
              onClick={() =>
                startAIDetailPaint({
                  promptDescription: detailPrompt,
                  materialTarget,
                })
              }
              disabled={isJobRunning}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-medium shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enhance Painted Region</span>
            </button>
          )}
        </div>

        {/* SECTION 4: AI SMART SELECTIONS */}
        <div className="space-y-3 pt-4 border-t border-[#252834]">
          <div className="flex items-center justify-between border-b border-[#252834] pb-1.5">
            <span className="font-semibold text-slate-200">AI Smart Segmentation</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(["subject", "background", "sky", "people", "hair", "objects"] as const).map(
              (target) => (
                <button
                  key={target}
                  onClick={() => startAISmartSelection(target)}
                  disabled={isJobRunning || !activeLayer}
                  className="py-1.5 px-2 bg-[#202430] hover:bg-[#292e3d] text-slate-200 hover:text-white rounded text-left capitalize transition-colors border border-[#2b303e]"
                >
                  Select {target}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

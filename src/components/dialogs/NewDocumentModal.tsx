import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const NewDocumentModal: React.FC = () => {
  const { isNewDocModalOpen, setNewDocModalOpen, createNewDocument } = useEditorStore();

  const [name, setName] = useState("Untitled-1");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [backgroundColor, setBackgroundColor] = useState("#12141a");

  if (!isNewDocModalOpen) return null;

  const presets = [
    { label: "Full HD (1080p)", w: 1920, h: 1080 },
    { label: "4K UHD", w: 3840, h: 2160 },
    { label: "8K UHD Master", w: 7680, h: 4320 },
    { label: "Instagram Square", w: 1080, h: 1080 },
    { label: "Portrait (4:5)", w: 1080, h: 1350 },
    { label: "Cinema 21:9", w: 3440, h: 1440 },
    { label: "Print A4 (300 DPI)", w: 2480, h: 3508 },
  ];

  const handleCreate = () => {
    createNewDocument(name, width, height, backgroundColor);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-[#2d3240] rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-xs text-[#8e95a7] select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262a36] bg-[#14161d]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>New Document</span>
          </div>
          <button
            onClick={() => setNewDocModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preset Chips */}
          <div>
            <label className="block text-slate-200 font-medium mb-1.5">Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setWidth(p.w);
                    setHeight(p.h);
                  }}
                  className={`p-2 rounded text-left border transition-all ${
                    width === p.w && height === p.h
                      ? "bg-cyan-950/60 border-cyan-500 text-white"
                      : "bg-[#20242f] border-transparent text-[#7a8192] hover:text-white"
                  }`}
                >
                  <div className="font-medium text-[11px] truncate">{p.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {p.w} × {p.h}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-slate-200 font-medium mb-1">Document Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#13151b] border border-[#2b303e] rounded p-2 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Custom Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-200 font-medium mb-1">Width (px)</label>
              <input
                type="number"
                min={100}
                max={16000}
                value={width}
                onChange={(e) => setWidth(Math.max(100, Number(e.target.value)))}
                className="w-full bg-[#13151b] border border-[#2b303e] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-200 font-medium mb-1">Height (px)</label>
              <input
                type="number"
                min={100}
                max={16000}
                value={height}
                onChange={(e) => setHeight(Math.max(100, Number(e.target.value)))}
                className="w-full bg-[#13151b] border border-[#2b303e] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-slate-200 font-medium mb-1.5">Background</label>
            <div className="flex gap-2">
              {[
                { label: "Dark Gray", val: "#12141a" },
                { label: "White", val: "#ffffff" },
                { label: "Black", val: "#000000" },
                { label: "Transparent", val: "transparent" },
              ].map((bg) => (
                <button
                  key={bg.val}
                  onClick={() => setBackgroundColor(bg.val)}
                  className={`flex-1 py-1.5 rounded border text-[11px] ${
                    backgroundColor === bg.val
                      ? "border-cyan-500 bg-cyan-950/40 text-cyan-200"
                      : "border-[#2b303e] bg-[#20242f] text-slate-400 hover:text-white"
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262a36] bg-[#14161d] flex items-center justify-end gap-2">
          <button
            onClick={() => setNewDocModalOpen(false)}
            className="px-3 py-1.5 rounded hover:bg-[#252936] text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium shadow-md transition-all"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

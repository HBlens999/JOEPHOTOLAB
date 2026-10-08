import React, { useState } from "react";
import { Sliders, X } from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const ImageSizeModal: React.FC = () => {
  const { document: doc, isImageSizeModalOpen, setImageSizeModalOpen, resizeDocument } = useEditorStore();

  const [width, setWidth] = useState(doc.width);
  const [height, setHeight] = useState(doc.height);
  const [constrain, setConstrain] = useState(true);

  if (!isImageSizeModalOpen) return null;

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (constrain && doc.width > 0) {
      setHeight(Math.round(val * (doc.height / doc.width)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (constrain && doc.height > 0) {
      setWidth(Math.round(val * (doc.width / doc.height)));
    }
  };

  const handleResize = () => {
    resizeDocument(width, height, true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#181a22] border border-[#2d3240] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-xs text-[#8e95a7] select-none">
        <div className="flex items-center justify-between p-4 border-b border-[#262a36] bg-[#14161d]">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Image Size</span>
          </div>
          <button
            onClick={() => setImageSizeModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-200 font-medium mb-1">Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-full bg-[#13151b] border border-[#2b303e] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-200 font-medium mb-1">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full bg-[#13151b] border border-[#2b303e] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={constrain}
              onChange={(e) => setConstrain(e.target.checked)}
              className="rounded bg-[#282d38] border-[#3b4150] text-cyan-500 focus:ring-0"
            />
            <span className="text-[11px] text-[#a5acbe]">Constrain Proportions</span>
          </label>
        </div>

        <div className="p-4 border-t border-[#262a36] bg-[#14161d] flex items-center justify-end gap-2">
          <button
            onClick={() => setImageSizeModalOpen(false)}
            className="px-3 py-1.5 rounded hover:bg-[#252936] text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResize}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium shadow-md transition-all"
          >
            Resize
          </button>
        </div>
      </div>
    </div>
  );
};

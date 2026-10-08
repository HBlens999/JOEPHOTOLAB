import React from "react";
import {
  Layers,
  Sliders,
  Sparkles,
  Bandage,
  Camera,
  History,
  ChevronRight,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";
import { LayersPanel } from "../panels/LayersPanel";
import { AdjustmentsPanel } from "../panels/AdjustmentsPanel";
import { AIEnginePanel } from "../panels/AIEnginePanel";
import { RetouchPanel } from "../panels/RetouchPanel";
import { RAWPanel } from "../panels/RAWPanel";

export const RightSidebar: React.FC = () => {
  const { activePanelTab, setActivePanelTab, undoStack, undo } = useEditorStore();

  return (
    <aside className="app-right-sidebar w-80 bg-[#16181f] border-l border-[#252830] flex flex-col select-none shrink-0 z-20 h-full">
      {/* Tab Navigation Header */}
      <div className="h-10 bg-[#13151b] border-b border-[#252830] flex items-center px-1 text-xs text-[#8d94a5] shrink-0">
        {[
          { id: "layers", label: "Layers", icon: <Layers className="w-3.5 h-3.5" /> },
          { id: "adjustments", label: "Adjust", icon: <Sliders className="w-3.5 h-3.5" /> },
          { id: "ai", label: "AI Engine", icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
          { id: "retouch", label: "Retouch", icon: <Bandage className="w-3.5 h-3.5" /> },
          { id: "raw", label: "RAW", icon: <Camera className="w-3.5 h-3.5 text-amber-400" /> },
        ].map((tab) => {
          const isActive = activePanelTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanelTab(tab.id as any)}
              className={`flex-1 py-1.5 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
                isActive
                  ? "bg-[#20242f] text-white font-medium shadow-sm"
                  : "hover:text-white hover:bg-[#1a1d25]"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activePanelTab === "layers" && <LayersPanel />}
        {activePanelTab === "adjustments" && <AdjustmentsPanel />}
        {activePanelTab === "ai" && <AIEnginePanel />}
        {activePanelTab === "retouch" && <RetouchPanel />}
        {activePanelTab === "raw" && <RAWPanel />}
      </div>
    </aside>
  );
};

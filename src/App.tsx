import React, { useEffect } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { TopBar } from "./components/layout/TopBar";
import { ToolOptionsBar } from "./components/layout/ToolOptionsBar";
import { LeftToolbar } from "./components/layout/LeftToolbar";
import { Workspace } from "./components/layout/Workspace";
import { RightSidebar } from "./components/layout/RightSidebar";
import { ExportModal } from "./components/dialogs/ExportModal";
import { NewDocumentModal } from "./components/dialogs/NewDocumentModal";
import { ImageSizeModal } from "./components/dialogs/ImageSizeModal";
import { RAWModal } from "./components/dialogs/RAWModal";
import { loadDocumentFromIDB } from "./store/persistence";
import { useEditorStore } from "./store/editorStore";

export function App() {
  const notification = useEditorStore((state) => state.notification);
  const clearNotification = useEditorStore((state) => state.clearNotification);

  // Restore document from IndexedDB on initial mount if available
  useEffect(() => {
    (async () => {
      try {
        const savedDoc = await loadDocumentFromIDB();
        // Do not resurrect the old cinematic demo document that shipped with
        // earlier builds. New JoePhotoLab sessions must open on the clean white
        // artboard; real user projects are still restored normally.
        const isLegacyDemo =
          savedDoc?.id === "doc_default_init" ||
          savedDoc?.name === "Alpine_Summit_Raw.dng";
        if (savedDoc && savedDoc.layers.length > 0 && !isLegacyDemo) {
          useEditorStore.setState({ document: savedDoc });
        }
      } catch (err) {
        console.warn("Could not load initial document from IndexedDB:", err);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121316] text-[#e0e2ec] overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Top Navigation Bar */}
      <TopBar />

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar />

      {/* 3. Main Workspace Core Dock */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <LeftToolbar />

        {/* Central WebGL2 Canvas / Viewport */}
        <Workspace />

        {/* Right Sidebar (Layers, Adjustments, AI Engine, Retouch, RAW) */}
        <RightSidebar />
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border text-xs max-w-md transition-all animate-in fade-in slide-in-from-bottom-2 bg-[#1b1e27] border-[#2e3444] text-white">
          {notification.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {notification.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {(!notification.type || notification.type === "info") && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
          <span className="flex-1 font-medium">{notification.message}</span>
          <button
            onClick={clearNotification}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modals & Dialogs */}
      <ExportModal />
      <NewDocumentModal />
      <ImageSizeModal />
      <RAWModal />
    </div>
  );
}

export default App;

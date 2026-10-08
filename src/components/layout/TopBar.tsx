import React, { useState, useRef, useEffect } from "react";
import {
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Sliders,
  Layers,
  ChevronDown,
  Check,
  FileImage,
  SunMedium,
  Grid,
} from "lucide-react";
import { useEditorStore } from "../../store/editorStore";

export const TopBar: React.FC = () => {
  const {
    document: doc,
    undoStack,
    redoStack,
    undo,
    redo,
    setZoom,
    resetView,
    fitToScreen,
    setTool,
    clearSelection,
    invertSelection,
    featherSelection,
    deleteSelectionPixels,
    setExportModalOpen,
    setNewDocModalOpen,
    setImageSizeModalOpen,
    setRAWModalOpen,
    exportProject,
    importFile,
    setActivePanelTab,
    startAISmartSelection,
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importFile(file);
    }
    e.target.value = "";
  };

  const zoomPercent = Math.round(doc.zoom * 100);

  return (
    <header className="h-10 bg-[#16181d] border-b border-[#252830] flex items-center justify-between px-3 text-xs select-none z-50 shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.psd,.dng,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2,.jpl,image/vnd.adobe.photoshop"
        className="hidden"
      />

      {/* Zone 1 & 2: Brand + Editorial Menus */}
      <div className="flex items-center gap-4" ref={menuBarRef}>
        {/* Brand Title */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-[#2a2e39]">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold text-[11px] shadow-sm">
            J
          </div>
          <span className="font-semibold text-white tracking-tight text-sm font-['Plus_Jakarta_Sans']">
            Joephotolab
          </span>
        </div>

        {/* Dropdown Menus */}
        <nav className="flex items-center space-x-1 text-[#b5bac7]">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => handleMenuClick("file")}
              className={`px-2.5 py-1 rounded hover:text-white transition-colors ${
                activeMenu === "file" ? "bg-[#272b36] text-white" : ""
              }`}
            >
              File
            </button>
            {activeMenu === "file" && (
              <div className="absolute left-0 mt-1 w-56 bg-[#1e212b] border border-[#2d323f] rounded-md shadow-2xl py-1 z-50 text-slate-200">
                <button
                  onClick={() => { setNewDocModalOpen(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>New Document...</span>
                  <span className="text-[10px] text-slate-400">Ctrl+N</span>
                </button>
                <button
                  onClick={handleOpenFileClick}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Open Image / RAW...</span>
                  <span className="text-[10px] text-slate-400">Ctrl+O</span>
                </button>
                <div className="my-1 border-t border-[#2d323f]" />
                <button
                  onClick={() => { exportProject(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Save Project (.jpl)</span>
                  <span className="text-[10px] text-slate-400">Ctrl+S</span>
                </button>
                <button
                  onClick={() => { setExportModalOpen(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Export Image (PNG, JPG, TIFF, PSD)...</span>
                  <span className="text-[10px] text-slate-400">Ctrl+Shift+E</span>
                </button>
                {doc.rawMetadata && (
                  <button
                    onClick={() => { setRAWModalOpen(true); setActiveMenu(null); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center text-cyan-400"
                  >
                    <span>Develop RAW Sensor Data...</span>
                    <span className="text-[10px] text-cyan-500">RAW</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => handleMenuClick("edit")}
              className={`px-2.5 py-1 rounded hover:text-white transition-colors ${
                activeMenu === "edit" ? "bg-[#272b36] text-white" : ""
              }`}
            >
              Edit
            </button>
            {activeMenu === "edit" && (
              <div className="absolute left-0 mt-1 w-52 bg-[#1e212b] border border-[#2d323f] rounded-md shadow-2xl py-1 z-50 text-slate-200">
                <button
                  onClick={() => { undo(); setActiveMenu(null); }}
                  disabled={undoStack.length === 0}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] disabled:opacity-40 flex justify-between items-center"
                >
                  <span>Undo</span>
                  <span className="text-[10px] text-slate-400">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => { redo(); setActiveMenu(null); }}
                  disabled={redoStack.length === 0}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] disabled:opacity-40 flex justify-between items-center"
                >
                  <span>Redo</span>
                  <span className="text-[10px] text-slate-400">Ctrl+Y</span>
                </button>
                <div className="my-1 border-t border-[#2d323f]" />
                <button
                  onClick={() => { deleteSelectionPixels(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Delete Selected Pixels</span>
                  <span className="text-[10px] text-slate-400">Del</span>
                </button>
              </div>
            )}
          </div>

          {/* Image Menu */}
          <div className="relative">
            <button
              onClick={() => handleMenuClick("image")}
              className={`px-2.5 py-1 rounded hover:text-white transition-colors ${
                activeMenu === "image" ? "bg-[#272b36] text-white" : ""
              }`}
            >
              Image
            </button>
            {activeMenu === "image" && (
              <div className="absolute left-0 mt-1 w-52 bg-[#1e212b] border border-[#2d323f] rounded-md shadow-2xl py-1 z-50 text-slate-200">
                <button
                  onClick={() => { setImageSizeModalOpen(true); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Image Size...</span>
                  <span className="text-[10px] text-slate-400">Alt+I</span>
                </button>
                <button
                  onClick={() => { setActivePanelTab("adjustments"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Adjustments Panel</span>
                  <span className="text-[10px] text-slate-400">Ctrl+U</span>
                </button>
              </div>
            )}
          </div>

          {/* Select Menu */}
          <div className="relative">
            <button
              onClick={() => handleMenuClick("select")}
              className={`px-2.5 py-1 rounded hover:text-white transition-colors ${
                activeMenu === "select" ? "bg-[#272b36] text-white" : ""
              }`}
            >
              Select
            </button>
            {activeMenu === "select" && (
              <div className="absolute left-0 mt-1 w-56 bg-[#1e212b] border border-[#2d323f] rounded-md shadow-2xl py-1 z-50 text-slate-200">
                <button
                  onClick={() => {
                    useEditorStore.getState().setRectSelection(0, 0, doc.width, doc.height);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Select All</span>
                  <span className="text-[10px] text-slate-400">Ctrl+A</span>
                </button>
                <button
                  onClick={() => { clearSelection(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Deselect</span>
                  <span className="text-[10px] text-slate-400">Ctrl+D</span>
                </button>
                <button
                  onClick={() => { invertSelection(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Invert Selection</span>
                  <span className="text-[10px] text-slate-400">Ctrl+Shift+I</span>
                </button>
                <button
                  onClick={() => { featherSelection(5); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Feather Edge (5px)</span>
                  <span className="text-[10px] text-slate-400">Shift+F6</span>
                </button>
                <div className="my-1 border-t border-[#2d323f]" />
                <div className="px-3 py-1 text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                  AI Smart Segmentation
                </div>
                <button
                  onClick={() => { startAISmartSelection("subject"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] text-cyan-300"
                >
                  Select Subject
                </button>
                <button
                  onClick={() => { startAISmartSelection("background"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140]"
                >
                  Select Background
                </button>
                <button
                  onClick={() => { startAISmartSelection("sky"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140]"
                >
                  Select Sky
                </button>
                <button
                  onClick={() => { startAISmartSelection("people"); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140]"
                >
                  Select People
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={() => handleMenuClick("view")}
              className={`px-2.5 py-1 rounded hover:text-white transition-colors ${
                activeMenu === "view" ? "bg-[#272b36] text-white" : ""
              }`}
            >
              View
            </button>
            {activeMenu === "view" && (
              <div className="absolute left-0 mt-1 w-52 bg-[#1e212b] border border-[#2d323f] rounded-md shadow-2xl py-1 z-50 text-slate-200">
                <button
                  onClick={() => { setZoom(doc.zoom * 1.25); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Zoom In</span>
                  <span className="text-[10px] text-slate-400">Ctrl++</span>
                </button>
                <button
                  onClick={() => { setZoom(doc.zoom / 1.25); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Zoom Out</span>
                  <span className="text-[10px] text-slate-400">Ctrl+-</span>
                </button>
                <button
                  onClick={() => { fitToScreen(window.innerWidth - 360, window.innerHeight - 100); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>Fit to Screen</span>
                  <span className="text-[10px] text-slate-400">Ctrl+0</span>
                </button>
                <button
                  onClick={() => { resetView(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#2c3140] flex justify-between items-center"
                >
                  <span>100% Actual Pixels</span>
                  <span className="text-[10px] text-slate-400">Ctrl+1</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Zone 3: Document Metadata & Primary Action Cluster */}
      <div className="flex items-center gap-3">
        {/* Document Dimensions & Color Space */}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-[#7f8596] font-mono tabular-nums">
          <span>
            {doc.width} × {doc.height} px
          </span>
          <span aria-hidden="true">·</span>
          <span>{doc.colorSpace}</span>
          <span aria-hidden="true">·</span>
          <span>{doc.bitDepth}-bit</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#1e212b] border border-[#2d323f] rounded px-1.5 py-0.5 text-[#b5bac7]">
          <button
            onClick={() => setZoom(doc.zoom / 1.2)}
            className="p-1 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="px-1 text-[11px] font-mono tabular-nums min-w-[38px] text-center">
            {zoomPercent}%
          </span>
          <button
            onClick={() => setZoom(doc.zoom * 1.2)}
            className="p-1 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Primary Export Action */}
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium text-xs shadow-sm transition-all whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

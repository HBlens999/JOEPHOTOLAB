import { create } from "zustand";
import {
  PhotoDocument,
  Layer,
  ToolType,
  BrushSettings,
  CloneSettings,
  SelectionState,
  AdjustmentSettings,
  BlendMode,
  getDefaultAdjustments,
  PerspectivePoint,
  RAWAdjustments,
  TextProperties,
  ShapeProperties,
} from "../types/document";
import { createDefaultDocument } from "./sampleDocument";
import { saveDocumentToIDB, exportProjectJPL } from "./persistence";
import {
  applyCloneStamp,
  applyHealingBrush,
  applySpotHealing,
} from "../engine/retouch";
import {
  createSelectionMask,
  selectRect,
  selectEllipse,
  selectPolygon,
  selectMagicWand,
  invertSelectionMask,
  featherSelectionMask,
  maskToCanvas,
  deleteSelectedPixels,
  SelectionMask,
} from "../engine/selections";
import { decodeRAWFile, developRAW } from "../engine/rawDecoder";
import { rectifyPerspective } from "../engine/homography";
import { parsePSD } from "../engine/psdReader";
import { convertColorSpace, SupportedColorSpace } from "../engine/colorManagement";

export interface HistoryEntry {
  description: string;
  timestamp: number;
  layersSnapshot: Array<{
    id: string;
    canvasData: ImageData | null;
    x: number;
    y: number;
    opacity: number;
    blendMode: BlendMode;
    visible: boolean;
    adjustments: AdjustmentSettings;
  }>;
}

export interface AIJobStatus {
  id: string;
  type: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
}

export interface EditorState {
  document: PhotoDocument;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  textSettings: TextProperties;
  setTextSettings: (settings: Partial<TextProperties>) => void;
  cloneSettings: CloneSettings;
  selection: SelectionState;
  perspectivePoints: PerspectivePoint[] | null;

  // History Stack
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Active AI Job
  currentAIJob: AIJobStatus | null;

  // Dialogs
  isExportModalOpen: boolean;
  isNewDocModalOpen: boolean;
  isImageSizeModalOpen: boolean;
  isRAWModalOpen: boolean;

  // In-app Notification / Toast
  notification: { message: string; type: "info" | "success" | "warning" | "error" } | null;
  showNotification: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  clearNotification: () => void;

  // Active Tab in Right Panel ('adjustments' | 'layers' | 'ai' | 'retouch' | 'raw')
  activePanelTab: "layers" | "adjustments" | "ai" | "retouch" | "raw";

  // Actions
  setTool: (tool: ToolType) => void;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setCloneSettings: (settings: Partial<CloneSettings>) => void;
  setActivePanelTab: (tab: EditorState["activePanelTab"]) => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  resetView: () => void;
  fitToScreen: (viewportWidth: number, viewportHeight: number) => void;

  // Document & Layers
  setActiveLayer: (id: string) => void;
  addRasterLayer: (name?: string) => void;
  addTextLayer: (x?: number, y?: number) => void;
  updateTextLayer: (id: string, props: Partial<TextProperties>) => void;
  addShapeLayer: (kind: ShapeProperties["kind"], x: number, y: number, width: number, height: number) => void;
  updateShapeLayer: (id: string, props: Partial<ShapeProperties>) => void;
  cropDocument: (x: number, y: number, width: number, height: number) => void;
  addAdjustmentLayer: (name: string, preset?: Partial<AdjustmentSettings>) => void;
  convertDocumentColorSpace: (targetSpace: SupportedColorSpace) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerLock: (id: string, locked: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  setLayerAIBlendStrength: (id: string, strength: number) => void;
  setLayerTransform: (id: string, x: number, y: number, width?: number, height?: number, rotation?: number) => void;
  updateActiveLayerAdjustments: (adjustments: Partial<AdjustmentSettings>) => void;
  updateRAWAdjustments: (adjustments: Partial<RAWAdjustments>) => void;

  // Retouch & Painting actions on active layer
  applyBrushStroke: (x0: number, y0: number, x1: number, y1: number, isEraser?: boolean) => void;
  applyCloneStroke: (destX: number, destY: number, strokeOrigin?: { x: number; y: number }) => void;
  applyHealingStroke: (destX: number, destY: number, strokeOrigin?: { x: number; y: number }) => void;
  applySpotHeal: (x: number, y: number, radius?: number) => void;

  // Selection actions
  setRectSelection: (x: number, y: number, width: number, height: number, mode?: "new" | "add" | "subtract") => void;
  setEllipseSelection: (cx: number, cy: number, rx: number, ry: number, mode?: "new" | "add" | "subtract") => void;
  setPolygonSelection: (points: Array<{ x: number; y: number }>, mode?: "new" | "add" | "subtract") => void;
  setWandSelection: (startX: number, startY: number, tolerance?: number, contiguous?: boolean) => void;
  clearSelection: () => void;
  invertSelection: () => void;
  featherSelection: (radius: number) => void;
  deleteSelectionPixels: () => void;
  selectionToLayerMask: () => void;

  // Perspective Homography
  initPerspectivePoints: () => void;
  setPerspectivePoint: (index: number, x: number, y: number) => void;
  applyPerspectiveCorrection: () => void;
  cancelPerspective: () => void;

  // AI Pipeline
  startAITextureSynthesis: (params: { textureType: any; detailFidelity: number; denoiseThreshold: number; customPrompt?: string }) => Promise<void>;
  startAIRelighting: (params: { lightDirectionAngle: number; highlightIntensity: number; lightSoftness: number; colorTemperature: number; rimLightStrength: number; catchlightEnhancer: boolean; shadowPreservation: number }) => Promise<void>;
  startAIDetailPaint: (params: { promptDescription?: string; materialTarget?: string }) => Promise<void>;
  startAISmartSelection: (target: "subject" | "background" | "sky" | "people" | "hair" | "objects") => Promise<void>;

  // History
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;

  // Import / Export / Modals
  setExportModalOpen: (open: boolean) => void;
  setNewDocModalOpen: (open: boolean) => void;
  setImageSizeModalOpen: (open: boolean) => void;
  setRAWModalOpen: (open: boolean) => void;
  createNewDocument: (name: string, width: number, height: number, backgroundColor: string) => void;
  resizeDocument: (width: number, height: number, resizeContent?: boolean) => void;
  importFile: (file: File) => Promise<void>;
  exportProject: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: createDefaultDocument(),
  activeTool: "move",
  brushSettings: {
    size: 32,
    hardness: 0.8,
    opacity: 1,
    flow: 1,
    smoothing: 0.2,
    color: "#000000",
  },
  textSettings: {
    text: "Double click to edit text",
    fontSize: 48,
    fontFamily: "Plus Jakarta Sans",
    fill: "#000000",
    fontWeight: "bold",
    fontStyle: "normal",
    letterSpacing: 0,
    lineHeight: 1.2,
    align: "left",
  },
  setTextSettings: (settings) =>
    set((state) => ({ textSettings: { ...state.textSettings, ...settings } })),

  cloneSettings: {
    sourceX: null,
    sourceY: null,
    aligned: true,
    sampleMode: "current",
  },
  selection: {
    active: false,
    maskCanvas: null,
    bounds: null,
    feather: 0,
  },
  perspectivePoints: null,
  undoStack: [],
  redoStack: [],
  currentAIJob: null,

  isExportModalOpen: false,
  isNewDocModalOpen: false,
  isImageSizeModalOpen: false,
  isRAWModalOpen: false,
  notification: null,
  showNotification: (message, type = "info") => {
    set({ notification: { message, type } });
    setTimeout(() => {
      if (get().notification?.message === message) {
        set({ notification: null });
      }
    }, 4500);
  },
  clearNotification: () => set({ notification: null }),
  activePanelTab: "layers",

  setTool: (tool) => {
    set({ activeTool: tool });
    if (tool === "perspective-crop") {
      get().initPerspectivePoints();
    }
  },

  setBrushSettings: (settings) =>
    set((state) => ({ brushSettings: { ...state.brushSettings, ...settings } })),

  setCloneSettings: (settings) =>
    set((state) => ({ cloneSettings: { ...state.cloneSettings, ...settings } })),

  setActivePanelTab: (tab) => set({ activePanelTab: tab }),

  setZoom: (zoom) =>
    set((state) => ({
      document: {
        ...state.document,
        zoom: Math.min(32, Math.max(0.01, zoom)),
      },
    })),

  setPan: (panX, panY) =>
    set((state) => ({
      document: {
        ...state.document,
        panX,
        panY,
      },
    })),

  resetView: () =>
    set((state) => ({
      document: { ...state.document, zoom: 1.0, panX: 0, panY: 0 },
    })),

  fitToScreen: (vpWidth, vpHeight) => {
    const doc = get().document;
    const padding = 80;
    const availW = Math.max(100, vpWidth - padding);
    const availH = Math.max(100, vpHeight - padding);
    const scale = Math.min(availW / doc.width, availH / doc.height, 1.5);
    set({
      document: {
        ...doc,
        zoom: Math.max(0.05, Math.min(2, scale)),
        panX: 0,
        panY: 0,
      },
    });
  },

  setActiveLayer: (id) =>
    set((state) => ({
      document: {
        ...state.document,
        activeLayerId: id,
        selectedLayerIds: [id],
      },
    })),

  addRasterLayer: (name) => {
    get().pushHistory("New Layer");
    const doc = get().document;
    const newCanvas = document.createElement("canvas");
    newCanvas.width = doc.width;
    newCanvas.height = doc.height;

    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: name || `Layer ${doc.layers.length + 1}`,
      type: "raster",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      x: 0,
      y: 0,
      width: doc.width,
      height: doc.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      canvas: newCanvas,
      adjustments: getDefaultAdjustments(),
    };

    set({
      document: {
        ...doc,
        layers: [newLayer, ...doc.layers],
        activeLayerId: newLayer.id,
        selectedLayerIds: [newLayer.id],
      },
    });
    saveDocumentToIDB(get().document);
  },

  addTextLayer: (x?: number, y?: number) => {
    get().pushHistory("New Text Layer");
    const doc = get().document;
    const newLayer: Layer = {
      id: `layer_text_${Date.now()}`,
      name: `Text ${doc.layers.length + 1}`,
      type: "text",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      x: x ?? doc.width * 0.1,
      y: y ?? doc.height * 0.4,
      width: doc.width * 0.8,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      textProps: { ...get().textSettings },
    };

    set({
      document: {
        ...doc,
        layers: [newLayer, ...doc.layers],
        activeLayerId: newLayer.id,
      },
    });
    saveDocumentToIDB(get().document);
  },

  updateTextLayer: (id, props) => {
    const doc = get().document;
    const layer = doc.layers.find((l) => l.id === id && l.type === "text" && l.textProps);
    if (!layer || !layer.textProps) return;
    set({
      document: {
        ...doc,
        layers: doc.layers.map((l) =>
          l.id === id && l.type === "text" && l.textProps
            ? { ...l, textProps: { ...l.textProps, ...props } }
            : l
        ),
      },
    });
    saveDocumentToIDB(get().document);
  },

  addShapeLayer: (kind, x, y, width, height) => {
    get().pushHistory(`New ${kind === "ellipse" ? "Ellipse" : "Rectangle"}`);
    const doc = get().document;
    const newLayer: Layer = {
      id: `shape_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: kind === "ellipse" ? "Ellipse" : "Rectangle",
      type: "shape",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      x,
      y,
      width: Math.max(1, width),
      height: Math.max(1, height),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      shapeProps: {
        kind,
        fill: get().brushSettings.color || "#ffffff",
        fillOpacity: 1,
        stroke: "#000000",
        strokeOpacity: 1,
        strokeWidth: 2,
        cornerRadius: 0,
      },
    };
    set({
      document: {
        ...doc,
        layers: [newLayer, ...doc.layers],
        activeLayerId: newLayer.id,
        selectedLayerIds: [newLayer.id],
      },
    });
    saveDocumentToIDB(get().document);
  },

  updateShapeLayer: (id, props) => {
    const doc = get().document;
    set({
      document: {
        ...doc,
        layers: doc.layers.map((layer) =>
          layer.id === id && layer.type === "shape" && layer.shapeProps
            ? { ...layer, shapeProps: { ...layer.shapeProps, ...props } }
            : layer
        ),
      },
    });
    saveDocumentToIDB(get().document);
  },

  cropDocument: (x, y, width, height) => {
    const doc = get().document;
    const cropX = Math.max(0, Math.min(Math.round(x), doc.width - 1));
    const cropY = Math.max(0, Math.min(Math.round(y), doc.height - 1));
    const cropW = Math.max(1, Math.min(Math.round(width), doc.width - cropX));
    const cropH = Math.max(1, Math.min(Math.round(height), doc.height - cropY));
    if (cropW < 2 || cropH < 2) return;

    get().pushHistory("Crop Document");
    const layers = doc.layers.map((layer) => ({
      ...layer,
      x: layer.x - cropX,
      y: layer.y - cropY,
    }));

    const newDoc: PhotoDocument = {
      ...doc,
      width: cropW,
      height: cropH,
      layers,
      zoom: 1,
      panX: 0,
      panY: 0,
    };

    const viewportWidth = Math.max(480, window.innerWidth - 420);
    const viewportHeight = Math.max(320, window.innerHeight - 150);
    newDoc.zoom = Math.max(
      0.05,
      Math.min(1, viewportWidth / cropW, viewportHeight / cropH)
    );

    set({ document: newDoc });
    saveDocumentToIDB(newDoc);
  },

  addAdjustmentLayer: (name, preset) => {
    get().pushHistory(`New ${name} Layer`);
    const doc = get().document;
    const initialAdjustments = {
      ...getDefaultAdjustments(),
      ...(preset || {}),
    };

    const newLayer: Layer = {
      id: `layer_adj_${Date.now()}`,
      name: name || `Adjustment ${doc.layers.length + 1}`,
      type: "adjustment",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      x: 0,
      y: 0,
      width: doc.width,
      height: doc.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      adjustments: initialAdjustments,
    };

    set({
      document: {
        ...doc,
        layers: [newLayer, ...doc.layers],
        activeLayerId: newLayer.id,
        selectedLayerIds: [newLayer.id],
      },
      activePanelTab: "adjustments",
    });
    saveDocumentToIDB(get().document);
  },

  convertDocumentColorSpace: (targetSpace) => {
    const doc = get().document;
    const prevSpace = doc.colorSpace;
    if (prevSpace === targetSpace) return;

    get().pushHistory(`Convert Color Space (${targetSpace})`);

    // Transform all raster layers
    const convertedLayers = doc.layers.map((l) => {
      if (l.canvas) {
        const ctx = l.canvas.getContext("2d");
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
          convertColorSpace(imgData, prevSpace, targetSpace);
          ctx.putImageData(imgData, 0, 0);
        }
      }
      return l;
    });

    set({
      document: {
        ...doc,
        colorSpace: targetSpace,
        layers: convertedLayers,
      },
    });
    saveDocumentToIDB(get().document);
  },

  deleteLayer: (id) => {
    get().pushHistory("Delete Layer");
    const doc = get().document;
    if (doc.layers.length <= 1) return; // Keep at least one layer

    const remaining = doc.layers.filter((l) => l.id !== id);
    const newActive = remaining[0]?.id || null;

    set({
      document: {
        ...doc,
        layers: remaining,
        activeLayerId: newActive,
        selectedLayerIds: newActive ? [newActive] : [],
      },
    });
    saveDocumentToIDB(get().document);
  },

  duplicateLayer: (id) => {
    get().pushHistory("Duplicate Layer");
    const doc = get().document;
    const target = doc.layers.find((l) => l.id === id);
    if (!target) return;

    let dupCanvas: HTMLCanvasElement | undefined;
    if (target.canvas) {
      dupCanvas = document.createElement("canvas");
      dupCanvas.width = target.canvas.width;
      dupCanvas.height = target.canvas.height;
      const ctx = dupCanvas.getContext("2d");
      ctx?.drawImage(target.canvas, 0, 0);
    }

    const dupLayer: Layer = {
      ...target,
      id: `layer_copy_${Date.now()}`,
      name: `${target.name} Copy`,
      canvas: dupCanvas,
      adjustments: target.adjustments ? JSON.parse(JSON.stringify(target.adjustments)) : undefined,
    };

    const idx = doc.layers.findIndex((l) => l.id === id);
    const newLayers = [...doc.layers];
    newLayers.splice(idx, 0, dupLayer);

    set({
      document: {
        ...doc,
        layers: newLayers,
        activeLayerId: dupLayer.id,
        selectedLayerIds: [dupLayer.id],
      },
    });
    saveDocumentToIDB(get().document);
  },

  reorderLayers: (fromIndex, toIndex) => {
    get().pushHistory("Reorder Layers");
    const doc = get().document;
    const newLayers = [...doc.layers];
    const [moved] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, moved);

    set({ document: { ...doc, layers: newLayers } });
    saveDocumentToIDB(get().document);
  },

  setLayerVisibility: (id, visible) => {
    const doc = get().document;
    const newLayers = doc.layers.map((l) => (l.id === id ? { ...l, visible } : l));
    set({ document: { ...doc, layers: newLayers } });
  },

  setLayerLock: (id, locked) => {
    const doc = get().document;
    const newLayers = doc.layers.map((l) => (l.id === id ? { ...l, locked } : l));
    set({ document: { ...doc, layers: newLayers } });
  },

  setLayerOpacity: (id, opacity) => {
    const doc = get().document;
    const newLayers = doc.layers.map((l) =>
      l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
    );
    set({ document: { ...doc, layers: newLayers } });
  },

  setLayerBlendMode: (id, mode) => {
    get().pushHistory("Change Blend Mode");
    const doc = get().document;
    const newLayers = doc.layers.map((l) => (l.id === id ? { ...l, blendMode: mode } : l));
    set({ document: { ...doc, layers: newLayers } });
  },

  setLayerAIBlendStrength: (id, strength) => {
    const doc = get().document;
    const newLayers = doc.layers.map((l) => {
      if (l.id === id && l.aiMetadata) {
        return {
          ...l,
          aiMetadata: { ...l.aiMetadata, aiBlendStrength: strength },
        };
      }
      return l;
    });
    set({ document: { ...doc, layers: newLayers } });
  },

  setLayerTransform: (id, x, y, width, height, rotation) => {
    const doc = get().document;
    const newLayers = doc.layers.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          x,
          y,
          width: width ?? l.width,
          height: height ?? l.height,
          rotation: rotation ?? l.rotation,
        };
      }
      return l;
    });
    set({ document: { ...doc, layers: newLayers } });
  },

  updateActiveLayerAdjustments: (adjustments) => {
    const doc = get().document;
    const activeId = doc.activeLayerId;
    if (!activeId) return;

    const newLayers = doc.layers.map((l) => {
      if (l.id === activeId) {
        return {
          ...l,
          adjustments: {
            ...(l.adjustments || getDefaultAdjustments()),
            ...adjustments,
          },
        };
      }
      return l;
    });

    set({ document: { ...doc, layers: newLayers } });
  },

  updateRAWAdjustments: (rawAdjustments) => {
    const doc = get().document;
    const current = doc.rawAdjustments || {
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

    const updated = { ...current, ...rawAdjustments };
    set({
      document: {
        ...doc,
        rawAdjustments: updated,
      },
    });

    // If active layer has RAW linear sensor backing, develop in real-time
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (activeLayer?.canvas) {
      developRAW(activeLayer.canvas, activeLayer.canvas, updated);
    }
  },

  applyBrushStroke: (x0, y0, x1, y1, isEraser = false) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas || activeLayer.locked) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    const { size, hardness, opacity, flow, color } = get().brushSettings;

    ctx.save();
    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * flow})`;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity * flow})`;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity * flow;
    }

    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x0 - activeLayer.x, y0 - activeLayer.y);
    ctx.lineTo(x1 - activeLayer.x, y1 - activeLayer.y);
    ctx.stroke();

    // End dab to ensure smooth continuous footprint
    ctx.beginPath();
    ctx.arc(x1 - activeLayer.x, y1 - activeLayer.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    set({ document: { ...doc } });
  },

  applyCloneStroke: (destX, destY, strokeOrigin) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    const { sourceX, sourceY, aligned, sampleMode } = get().cloneSettings;
    if (!activeLayer || !activeLayer.canvas || sourceX === null || sourceY === null) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    let effSrcX = sourceX;
    let effSrcY = sourceY;
    if (aligned && strokeOrigin) {
      effSrcX = sourceX + (destX - strokeOrigin.x);
      effSrcY = sourceY + (destY - strokeOrigin.y);
    }

    let sourceCanvas = activeLayer.canvas;
    if (sampleMode === "all" || sampleMode === "current-below") {
      const compCanvas = document.createElement("canvas");
      compCanvas.width = doc.width;
      compCanvas.height = doc.height;
      const cCtx = compCanvas.getContext("2d");
      if (cCtx) {
        const activeIdx = doc.layers.findIndex((l) => l.id === activeLayer.id);
        const layersToSample = sampleMode === "all"
          ? [...doc.layers].reverse()
          : [...doc.layers.slice(activeIdx)].reverse();
        for (const l of layersToSample) {
          if (l.visible && l.canvas) {
            cCtx.globalAlpha = l.opacity;
            cCtx.drawImage(l.canvas, l.x, l.y, l.width, l.height);
          }
        }
        sourceCanvas = compCanvas;
      }
    }

    applyCloneStamp(
      ctx,
      sourceCanvas,
      effSrcX,
      effSrcY,
      destX - activeLayer.x,
      destY - activeLayer.y,
      {
        radius: get().brushSettings.size / 2,
        hardness: get().brushSettings.hardness,
        opacity: get().brushSettings.opacity,
        flow: get().brushSettings.flow,
      }
    );

    set({ document: { ...doc } });
  },

  applyHealingStroke: (destX, destY, strokeOrigin) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    const { sourceX, sourceY, aligned, sampleMode } = get().cloneSettings;
    if (!activeLayer || !activeLayer.canvas || sourceX === null || sourceY === null) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    let effSrcX = sourceX;
    let effSrcY = sourceY;
    if (aligned && strokeOrigin) {
      effSrcX = sourceX + (destX - strokeOrigin.x);
      effSrcY = sourceY + (destY - strokeOrigin.y);
    }

    let sourceCanvas = activeLayer.canvas;
    if (sampleMode === "all" || sampleMode === "current-below") {
      const compCanvas = document.createElement("canvas");
      compCanvas.width = doc.width;
      compCanvas.height = doc.height;
      const cCtx = compCanvas.getContext("2d");
      if (cCtx) {
        const activeIdx = doc.layers.findIndex((l) => l.id === activeLayer.id);
        const layersToSample = sampleMode === "all"
          ? [...doc.layers].reverse()
          : [...doc.layers.slice(activeIdx)].reverse();
        for (const l of layersToSample) {
          if (l.visible && l.canvas) {
            cCtx.globalAlpha = l.opacity;
            cCtx.drawImage(l.canvas, l.x, l.y, l.width, l.height);
          }
        }
        sourceCanvas = compCanvas;
      }
    }

    applyHealingBrush(
      ctx,
      sourceCanvas,
      effSrcX,
      effSrcY,
      destX - activeLayer.x,
      destY - activeLayer.y,
      {
        radius: get().brushSettings.size / 2,
        hardness: get().brushSettings.hardness,
        opacity: get().brushSettings.opacity,
        flow: get().brushSettings.flow,
      }
    );

    set({ document: { ...doc } });
  },

  applySpotHeal: (x, y, radius) => {
    get().pushHistory("Spot Healing");
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    const r = radius || get().brushSettings.size / 2;
    applySpotHealing(ctx, x - activeLayer.x, y - activeLayer.y, r);
    set({ document: { ...doc } });
  },

  // Selection Implementations
  setRectSelection: (x, y, width, height, mode = "new") => {
    const doc = get().document;
    const mask = createSelectionMask(doc.width, doc.height);
    selectRect(mask, x, y, width, height, mode);
    const canvas = maskToCanvas(mask);

    set({
      selection: {
        active: true,
        maskCanvas: canvas,
        bounds: { x, y, width, height },
        feather: 0,
      },
    });
  },

  setEllipseSelection: (cx, cy, rx, ry, mode = "new") => {
    const doc = get().document;
    const mask = createSelectionMask(doc.width, doc.height);
    selectEllipse(mask, cx, cy, rx, ry, mode);
    const canvas = maskToCanvas(mask);

    set({
      selection: {
        active: true,
        maskCanvas: canvas,
        bounds: { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 },
        feather: 0,
      },
    });
  },

  setPolygonSelection: (points, mode = "new") => {
    const doc = get().document;
    const mask = createSelectionMask(doc.width, doc.height);
    selectPolygon(mask, points, mode);
    const canvas = maskToCanvas(mask);

    set({
      selection: {
        active: true,
        maskCanvas: canvas,
        bounds: { x: 0, y: 0, width: doc.width, height: doc.height },
        feather: 0,
      },
    });
  },

  setWandSelection: (startX, startY, tolerance = 32, contiguous = true) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas) return;

    const ctx = activeLayer.canvas.getContext("2d");
    if (!ctx) return;

    const mask = createSelectionMask(doc.width, doc.height);
    selectMagicWand(mask, ctx, startX, startY, tolerance, contiguous, "new");
    const canvas = maskToCanvas(mask);

    set({
      selection: {
        active: true,
        maskCanvas: canvas,
        bounds: { x: 0, y: 0, width: doc.width, height: doc.height },
        feather: 0,
      },
    });
  },

  clearSelection: () => {
    set({
      selection: {
        active: false,
        maskCanvas: null,
        bounds: null,
        feather: 0,
      },
    });
  },

  invertSelection: () => {
    const sel = get().selection;
    if (!sel.active || !sel.maskCanvas) return;

    const ctx = sel.maskCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, sel.maskCanvas.width, sel.maskCanvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const inv = 255 - imgData.data[i];
      imgData.data[i] = inv;
      imgData.data[i + 1] = inv;
      imgData.data[i + 2] = inv;
    }
    ctx.putImageData(imgData, 0, 0);
    set({ selection: { ...sel } });
  },

  featherSelection: (radius) => {
    const sel = get().selection;
    if (!sel.active || !sel.maskCanvas) return;

    const doc = get().document;
    const ctx = sel.maskCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, doc.width, doc.height);
    const mask: SelectionMask = {
      width: doc.width,
      height: doc.height,
      data: new Uint8Array(doc.width * doc.height),
    };
    for (let i = 0; i < mask.data.length; i++) {
      mask.data[i] = imgData.data[i * 4];
    }

    const feathered = featherSelectionMask(mask, radius);
    const featheredCanvas = maskToCanvas(feathered);

    set({
      selection: {
        ...sel,
        maskCanvas: featheredCanvas,
        feather: radius,
      },
    });
  },

  deleteSelectionPixels: () => {
    const sel = get().selection;
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!sel.active || !sel.maskCanvas || !activeLayer || !activeLayer.canvas) return;

    get().pushHistory("Delete Selected Pixels");
    deleteSelectedPixels(activeLayer.canvas, sel.maskCanvas);
    set({ document: { ...doc } });
  },

  selectionToLayerMask: () => {
    const sel = get().selection;
    const doc = get().document;
    const activeId = doc.activeLayerId;
    if (!sel.active || !sel.maskCanvas || !activeId) return;

    get().pushHistory("Selection to Layer Mask");
    const maskCopy = document.createElement("canvas");
    maskCopy.width = sel.maskCanvas.width;
    maskCopy.height = sel.maskCanvas.height;
    maskCopy.getContext("2d")?.drawImage(sel.maskCanvas, 0, 0);

    const newLayers = doc.layers.map((l) => {
      if (l.id === activeId) {
        return {
          ...l,
          mask: {
            canvas: maskCopy,
            enabled: true,
            inverted: false,
            feather: 0,
            opacity: 1,
          },
        };
      }
      return l;
    });

    set({
      document: { ...doc, layers: newLayers },
      selection: { active: false, maskCanvas: null, bounds: null, feather: 0 },
    });
  },

  // Perspective Homography
  initPerspectivePoints: () => {
    const doc = get().document;
    set({
      perspectivePoints: [
        { x: doc.width * 0.1, y: doc.height * 0.1 },
        { x: doc.width * 0.9, y: doc.height * 0.1 },
        { x: doc.width * 0.9, y: doc.height * 0.9 },
        { x: doc.width * 0.1, y: doc.height * 0.9 },
      ],
    });
  },

  setPerspectivePoint: (index, x, y) => {
    const points = get().perspectivePoints;
    if (!points) return;
    const updated = [...points];
    updated[index] = { x, y };
    set({ perspectivePoints: updated });
  },

  applyPerspectiveCorrection: () => {
    get().pushHistory("Perspective Correction");
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    const pts = get().perspectivePoints;
    if (!activeLayer || !activeLayer.canvas || !pts) return;

    // Apply 4-corner perspective projective homography transformation
    const rectified = rectifyPerspective(activeLayer.canvas, pts);
    activeLayer.canvas = rectified;
    activeLayer.width = rectified.width;
    activeLayer.height = rectified.height;

    set({
      document: { ...doc },
      perspectivePoints: null,
      activeTool: "move",
    });
    saveDocumentToIDB(get().document);
  },

  cancelPerspective: () => {
    set({ perspectivePoints: null, activeTool: "move" });
  },

  // AI Workflows
  startAITextureSynthesis: async (params) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas) {
      get().showNotification("Please select a raster image layer to synthesize textures.", "warning");
      return;
    }

    const imageBase64 = activeLayer.canvas.toDataURL("image/png");

    set({
      currentAIJob: {
        id: "texture_job",
        type: "8K Micro-Texture",
        status: "queued",
        progress: 10,
      },
    });

    try {
      const res = await fetch("/api/ai/texture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          textureType: params.textureType,
          detailFidelity: params.detailFidelity,
          denoiseThreshold: params.denoiseThreshold,
          customPrompt: params.customPrompt,
          sourceLayerId: activeLayer.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to start AI texture synthesis job");
      const { jobId } = await res.json();

      // Poll job
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/ai/jobs/${jobId}`);
          if (!pollRes.ok) return;
          const jobData = await pollRes.json();

          set({
            currentAIJob: {
              id: jobId,
              type: "8K Micro-Texture",
              status: jobData.status,
              progress: jobData.progress,
              error: jobData.error,
            },
          });

          if (jobData.status === "completed" && jobData.resultImageData) {
            clearInterval(pollInterval);

            // Create new AI Overlay Layer
            const img = new Image();
            img.onload = () => {
              const aiCanvas = document.createElement("canvas");
              aiCanvas.width = doc.width;
              aiCanvas.height = doc.height;
              aiCanvas.getContext("2d")?.drawImage(img, 0, 0, doc.width, doc.height);

              const newAILayer: Layer = {
                id: `ai_layer_${Date.now()}`,
                name: `AI Texture (${params.textureType})`,
                type: "ai",
                visible: true,
                locked: false,
                opacity: 1,
                blendMode: "normal",
                x: activeLayer.x,
                y: activeLayer.y,
                width: doc.width,
                height: doc.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                canvas: aiCanvas,
                aiMetadata: {
                  generated: true,
                  provider: "Google Gemini",
                  model: "gemini-3.1-flash-lite-image",
                  operation: `8K Micro-Texture (${params.textureType})`,
                  promptVersion: "1.0",
                  sourceLayerId: activeLayer.id,
                  createdAt: new Date().toISOString(),
                  aiBlendStrength: 100,
                },
                adjustments: getDefaultAdjustments(),
              };

              get().pushHistory("AI 8K Texture Synthesis");
              set((state) => ({
                document: {
                  ...state.document,
                  layers: [newAILayer, ...state.document.layers],
                  activeLayerId: newAILayer.id,
                },
                currentAIJob: null,
              }));
              saveDocumentToIDB(get().document);
            };
            img.src = jobData.resultImageData;
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          set({
            currentAIJob: {
              id: jobId,
              type: "8K Micro-Texture",
              status: "failed",
              progress: 100,
              error: err.message,
            },
          });
        }
      }, 1500);
    } catch (err: any) {
      set({
        currentAIJob: {
          id: "failed",
          type: "8K Micro-Texture",
          status: "failed",
          progress: 100,
          error: err.message,
        },
      });
    }
  },

  startAIRelighting: async (params) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas) {
      get().showNotification("Please select a raster image layer to apply studio relighting.", "warning");
      return;
    }

    const imageBase64 = activeLayer.canvas.toDataURL("image/png");

    set({
      currentAIJob: {
        id: "relighting_job",
        type: "Studio Relighting",
        status: "queued",
        progress: 10,
      },
    });

    try {
      const res = await fetch("/api/ai/relighting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          ...params,
          sourceLayerId: activeLayer.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to start relighting job");
      const { jobId } = await res.json();

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/ai/jobs/${jobId}`);
          if (!pollRes.ok) return;
          const jobData = await pollRes.json();

          set({
            currentAIJob: {
              id: jobId,
              type: "Studio Relighting",
              status: jobData.status,
              progress: jobData.progress,
              error: jobData.error,
            },
          });

          if (jobData.status === "completed" && jobData.resultImageData) {
            clearInterval(pollInterval);

            const img = new Image();
            img.onload = () => {
              const aiCanvas = document.createElement("canvas");
              aiCanvas.width = doc.width;
              aiCanvas.height = doc.height;
              aiCanvas.getContext("2d")?.drawImage(img, 0, 0, doc.width, doc.height);

              const newAILayer: Layer = {
                id: `ai_relight_${Date.now()}`,
                name: `AI Relighted (${params.lightDirectionAngle}°)`,
                type: "ai",
                visible: true,
                locked: false,
                opacity: 1,
                blendMode: "normal",
                x: activeLayer.x,
                y: activeLayer.y,
                width: doc.width,
                height: doc.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                canvas: aiCanvas,
                aiMetadata: {
                  generated: true,
                  provider: "Google Gemini",
                  model: "gemini-3.1-flash-lite-image",
                  operation: `Dynamic Relighting (${params.lightDirectionAngle}°)`,
                  promptVersion: "1.0",
                  sourceLayerId: activeLayer.id,
                  createdAt: new Date().toISOString(),
                  aiBlendStrength: 100,
                },
                adjustments: getDefaultAdjustments(),
              };

              get().pushHistory("AI Studio Relighting");
              set((state) => ({
                document: {
                  ...state.document,
                  layers: [newAILayer, ...state.document.layers],
                  activeLayerId: newAILayer.id,
                },
                currentAIJob: null,
              }));
              saveDocumentToIDB(get().document);
            };
            img.src = jobData.resultImageData;
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          set({
            currentAIJob: {
              id: jobId,
              type: "Studio Relighting",
              status: "failed",
              progress: 100,
              error: err.message,
            },
          });
        }
      }, 1500);
    } catch (err: any) {
      set({
        currentAIJob: {
          id: "failed",
          type: "Studio Relighting",
          status: "failed",
          progress: 100,
          error: err.message,
        },
      });
    }
  },

  startAIDetailPaint: async (params) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    const sel = get().selection;
    if (!activeLayer || !activeLayer.canvas || !sel.active || !sel.maskCanvas) {
      get().showNotification("Please paint or select a region with the AI Detail Brush first.", "warning");
      return;
    }

    const imageBase64 = activeLayer.canvas.toDataURL("image/png");
    const maskBase64 = sel.maskCanvas.toDataURL("image/png");

    set({
      currentAIJob: {
        id: "detail_paint_job",
        type: "AI Detail Paint",
        status: "queued",
        progress: 10,
      },
    });

    try {
      const res = await fetch("/api/ai/detail-paint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          maskBase64,
          promptDescription: params.promptDescription,
          materialTarget: params.materialTarget,
          sourceLayerId: activeLayer.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to start detail paint job");
      const { jobId } = await res.json();

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/ai/jobs/${jobId}`);
          if (!pollRes.ok) return;
          const jobData = await pollRes.json();

          set({
            currentAIJob: {
              id: jobId,
              type: "AI Detail Paint",
              status: jobData.status,
              progress: jobData.progress,
              error: jobData.error,
            },
          });

          if (jobData.status === "completed" && jobData.resultImageData) {
            clearInterval(pollInterval);

            const img = new Image();
            img.onload = () => {
              const aiCanvas = document.createElement("canvas");
              aiCanvas.width = doc.width;
              aiCanvas.height = doc.height;
              aiCanvas.getContext("2d")?.drawImage(img, 0, 0, doc.width, doc.height);

              const newAILayer: Layer = {
                id: `ai_detail_${Date.now()}`,
                name: `AI Detail Layer`,
                type: "ai",
                visible: true,
                locked: false,
                opacity: 1,
                blendMode: "normal",
                x: activeLayer.x,
                y: activeLayer.y,
                width: doc.width,
                height: doc.height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                canvas: aiCanvas,
                aiMetadata: {
                  generated: true,
                  provider: "Google Gemini",
                  model: "gemini-3.1-flash-lite-image",
                  operation: "AI Detail Paint",
                  promptVersion: "1.0",
                  sourceLayerId: activeLayer.id,
                  createdAt: new Date().toISOString(),
                  aiBlendStrength: 100,
                },
                adjustments: getDefaultAdjustments(),
              };

              get().pushHistory("AI Detail Paint");
              set((state) => ({
                document: {
                  ...state.document,
                  layers: [newAILayer, ...state.document.layers],
                  activeLayerId: newAILayer.id,
                },
                currentAIJob: null,
              }));
              get().clearSelection();
              saveDocumentToIDB(get().document);
            };
            img.src = jobData.resultImageData;
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          set({
            currentAIJob: {
              id: jobId,
              type: "AI Detail Paint",
              status: "failed",
              progress: 100,
              error: err.message,
            },
          });
        }
      }, 1500);
    } catch (err: any) {
      set({
        currentAIJob: {
          id: "failed",
          type: "AI Detail Paint",
          status: "failed",
          progress: 100,
          error: err.message,
        },
      });
    }
  },

  startAISmartSelection: async (target) => {
    const doc = get().document;
    const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);
    if (!activeLayer || !activeLayer.canvas) {
      get().showNotification("Please select a layer for smart selection.", "warning");
      return;
    }

    const imageBase64 = activeLayer.canvas.toDataURL("image/png");

    set({
      currentAIJob: {
        id: "smart_selection_job",
        type: `Smart Selection (${target})`,
        status: "queued",
        progress: 15,
      },
    });

    try {
      const res = await fetch("/api/ai/smart-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          target,
          sourceLayerId: activeLayer.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to start smart selection");
      const { jobId } = await res.json();

      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/ai/jobs/${jobId}`);
          if (!pollRes.ok) return;
          const jobData = await pollRes.json();

          set({
            currentAIJob: {
              id: jobId,
              type: `Smart Selection (${target})`,
              status: jobData.status,
              progress: jobData.progress,
              error: jobData.error,
            },
          });

          if (jobData.status === "completed" && jobData.resultMaskData) {
            clearInterval(pollInterval);

            const maskImg = new Image();
            maskImg.onload = () => {
              const maskCanvas = document.createElement("canvas");
              maskCanvas.width = doc.width;
              maskCanvas.height = doc.height;
              maskCanvas.getContext("2d")?.drawImage(maskImg, 0, 0, doc.width, doc.height);

              set({
                selection: {
                  active: true,
                  maskCanvas,
                  bounds: { x: 0, y: 0, width: doc.width, height: doc.height },
                  feather: 0,
                },
                currentAIJob: null,
              });
            };
            maskImg.src = jobData.resultMaskData;
          } else if (jobData.status === "failed") {
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          clearInterval(pollInterval);
          set({
            currentAIJob: {
              id: jobId,
              type: `Smart Selection (${target})`,
              status: "failed",
              progress: 100,
              error: err.message,
            },
          });
        }
      }, 1500);
    } catch (err: any) {
      set({
        currentAIJob: {
          id: "failed",
          type: `Smart Selection (${target})`,
          status: "failed",
          progress: 100,
          error: err.message,
        },
      });
    }
  },

  // History & Undo / Redo
  pushHistory: (description) => {
    const doc = get().document;
    const snapshot: HistoryEntry["layersSnapshot"] = doc.layers.map((l) => {
      let canvasData: ImageData | null = null;
      if (l.canvas) {
        const ctx = l.canvas.getContext("2d");
        if (ctx) canvasData = ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
      }
      return {
        id: l.id,
        canvasData,
        x: l.x,
        y: l.y,
        opacity: l.opacity,
        blendMode: l.blendMode,
        visible: l.visible,
        adjustments: JSON.parse(JSON.stringify(l.adjustments || getDefaultAdjustments())),
      };
    });

    const entry: HistoryEntry = {
      description,
      timestamp: Date.now(),
      layersSnapshot: snapshot,
    };

    set((state) => ({
      undoStack: [entry, ...state.undoStack].slice(0, 40),
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack, document: doc } = get();
    if (undoStack.length === 0) return;

    const [current, ...restUndo] = undoStack;

    // Snapshot current state for redo
    const redoEntry: HistoryEntry = {
      description: current.description,
      timestamp: Date.now(),
      layersSnapshot: doc.layers.map((l) => ({
        id: l.id,
        canvasData: l.canvas?.getContext("2d")?.getImageData(0, 0, l.canvas.width, l.canvas.height) || null,
        x: l.x,
        y: l.y,
        opacity: l.opacity,
        blendMode: l.blendMode,
        visible: l.visible,
        adjustments: JSON.parse(JSON.stringify(l.adjustments || getDefaultAdjustments())),
      })),
    };

    // Restore layers
    for (const snap of current.layersSnapshot) {
      const layer = doc.layers.find((l) => l.id === snap.id);
      if (layer) {
        layer.x = snap.x;
        layer.y = snap.y;
        layer.opacity = snap.opacity;
        layer.blendMode = snap.blendMode;
        layer.visible = snap.visible;
        layer.adjustments = snap.adjustments;
        if (layer.canvas && snap.canvasData) {
          layer.canvas.getContext("2d")?.putImageData(snap.canvasData, 0, 0);
        }
      }
    }

    set({
      document: { ...doc },
      undoStack: restUndo,
      redoStack: [redoEntry, ...redoStack],
    });
  },

  redo: () => {
    const { undoStack, redoStack, document: doc } = get();
    if (redoStack.length === 0) return;

    const [next, ...restRedo] = redoStack;

    // Snapshot current for undo
    const undoEntry: HistoryEntry = {
      description: next.description,
      timestamp: Date.now(),
      layersSnapshot: doc.layers.map((l) => ({
        id: l.id,
        canvasData: l.canvas?.getContext("2d")?.getImageData(0, 0, l.canvas.width, l.canvas.height) || null,
        x: l.x,
        y: l.y,
        opacity: l.opacity,
        blendMode: l.blendMode,
        visible: l.visible,
        adjustments: JSON.parse(JSON.stringify(l.adjustments || getDefaultAdjustments())),
      })),
    };

    for (const snap of next.layersSnapshot) {
      const layer = doc.layers.find((l) => l.id === snap.id);
      if (layer) {
        layer.x = snap.x;
        layer.y = snap.y;
        layer.opacity = snap.opacity;
        layer.blendMode = snap.blendMode;
        layer.visible = snap.visible;
        layer.adjustments = snap.adjustments;
        if (layer.canvas && snap.canvasData) {
          layer.canvas.getContext("2d")?.putImageData(snap.canvasData, 0, 0);
        }
      }
    }

    set({
      document: { ...doc },
      undoStack: [undoEntry, ...undoStack],
      redoStack: restRedo,
    });
  },

  // Modals & Document IO
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setNewDocModalOpen: (open) => set({ isNewDocModalOpen: open }),
  setImageSizeModalOpen: (open) => set({ isImageSizeModalOpen: open }),
  setRAWModalOpen: (open) => set({ isRAWModalOpen: open }),

  createNewDocument: (name, width, height, backgroundColor) => {
    get().pushHistory("New Document");
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = width;
    bgCanvas.height = height;
    const ctx = bgCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = backgroundColor || "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    const baseLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: "Background",
      type: "raster",
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: "normal",
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      canvas: bgCanvas,
      adjustments: getDefaultAdjustments(),
    };

    const newDoc: PhotoDocument = {
      id: `doc_${Date.now()}`,
      name: name.endsWith(".jpl") ? name : `${name}.jpl`,
      width,
      height,
      resolution: 300,
      colorSpace: "sRGB",
      bitDepth: 8,
      backgroundColor,
      layers: [baseLayer],
      activeLayerId: baseLayer.id,
      selectedLayerIds: [baseLayer.id],
      guides: [],
      rulers: true,
      grid: { visible: false, size: 24 },
      zoom: 1.0,
      panX: 0,
      panY: 0,
    };

    const viewportWidth = Math.max(480, window.innerWidth - 420);
    const viewportHeight = Math.max(320, window.innerHeight - 150);
    newDoc.zoom = Math.max(
      0.05,
      Math.min(1, viewportWidth / Math.max(1, width), viewportHeight / Math.max(1, height))
    );

    set({ document: newDoc, isNewDocModalOpen: false });
    saveDocumentToIDB(newDoc);
  },

  resizeDocument: (newWidth, newHeight, resizeContent = true) => {
    get().pushHistory("Resize Document");
    const doc = get().document;
    const oldWidth = doc.width;
    const oldHeight = doc.height;

    const resizedLayers = doc.layers.map((l) => {
      if (l.canvas) {
        const c = document.createElement("canvas");
        c.width = resizeContent ? newWidth : l.canvas.width;
        c.height = resizeContent ? newHeight : l.canvas.height;
        const ctx = c.getContext("2d");
        if (resizeContent) {
          ctx?.drawImage(l.canvas, 0, 0, newWidth, newHeight);
        } else {
          ctx?.drawImage(l.canvas, 0, 0);
        }
        return {
          ...l,
          width: resizeContent ? newWidth : l.width,
          height: resizeContent ? newHeight : l.height,
          canvas: c,
        };
      }
      return l;
    });

    set({
      document: {
        ...doc,
        width: newWidth,
        height: newHeight,
        layers: resizedLayers,
      },
      isImageSizeModalOpen: false,
    });
    saveDocumentToIDB(get().document);
  },

  importFile: async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isRAW = ["dng", "cr2", "cr3", "nef", "arw", "raf", "orf", "rw2"].includes(ext);

    if (isRAW) {
      try {
        const buffer = await file.arrayBuffer();
        const rawResult = await decodeRAWFile(buffer);

        const rawLayer: Layer = {
          id: `layer_raw_${Date.now()}`,
          name: file.name,
          type: "raster",
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "normal",
          x: 0,
          y: 0,
          width: rawResult.width,
          height: rawResult.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          canvas: rawResult.renderedCanvas,
          adjustments: getDefaultAdjustments(),
        };

        const newDoc: PhotoDocument = {
          id: `doc_${Date.now()}`,
          name: file.name,
          width: rawResult.width,
          height: rawResult.height,
          resolution: 300,
          colorSpace: "Display-P3",
          bitDepth: 16,
          backgroundColor: "#ffffff",
          layers: [rawLayer],
          activeLayerId: rawLayer.id,
          selectedLayerIds: [rawLayer.id],
          guides: [],
          rulers: true,
          grid: { visible: false, size: 24 },
          zoom: 0.8,
          panX: 0,
          panY: 0,
          rawMetadata: rawResult.metadata,
          rawAdjustments: {
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
          },
          rawSourceBuffer: buffer,
        };

        set({
          document: newDoc,
          activePanelTab: "raw",
          isRAWModalOpen: true,
        });
        saveDocumentToIDB(newDoc);
        return;
      } catch (err) {
        console.error("RAW decode failed:", err);
        get().showNotification("Failed to decode RAW file. Loading as standard image fallback.", "warning");
      }
    }

    // Adobe Photoshop .psd import
    if (ext === "psd") {
      try {
        const buffer = await file.arrayBuffer();
        const psdResult = await parsePSD(buffer);

        const newDoc: PhotoDocument = {
          id: `doc_psd_${Date.now()}`,
          name: file.name,
          width: psdResult.width,
          height: psdResult.height,
          resolution: 300,
          colorSpace: "sRGB",
          bitDepth: 8,
          backgroundColor: "#ffffff",
          layers: psdResult.layers,
          activeLayerId: psdResult.layers[0]?.id || null,
          selectedLayerIds: psdResult.layers[0]?.id ? [psdResult.layers[0].id] : [],
          guides: [],
          rulers: true,
          grid: { visible: false, size: 24 },
          zoom: 0.8,
          panX: 0,
          panY: 0,
        };

        set({ document: newDoc });
        saveDocumentToIDB(newDoc);
        return;
      } catch (err: any) {
        console.error("PSD import failed:", err);
        get().showNotification(`Failed to import PSD: ${err.message}`, "error");
        return;
      }
    }

    // Joephotolab .jpl project import
    if (ext === "jpl") {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const restoredLayers: Layer[] = await Promise.all(
          parsed.layers.map(async (l: any) => {
            let canvas: HTMLCanvasElement | undefined;
            if (l.canvasDataURL) {
              const img = new Image();
              await new Promise((res) => {
                img.onload = res;
                img.src = l.canvasDataURL;
              });
              canvas = document.createElement("canvas");
              canvas.width = l.width || img.naturalWidth;
              canvas.height = l.height || img.naturalHeight;
              canvas.getContext("2d")?.drawImage(img, 0, 0);
            }
            return {
              ...l,
              canvas,
            };
          })
        );

        const newDoc: PhotoDocument = {
          id: `doc_jpl_${Date.now()}`,
          name: parsed.name || file.name,
          width: parsed.width,
          height: parsed.height,
          resolution: parsed.resolution || 300,
          colorSpace: parsed.colorSpace || "sRGB",
          bitDepth: parsed.bitDepth || 8,
          backgroundColor: parsed.backgroundColor || "#ffffff",
          layers: restoredLayers,
          activeLayerId: restoredLayers[0]?.id || null,
          selectedLayerIds: restoredLayers[0]?.id ? [restoredLayers[0].id] : [],
          guides: [],
          rulers: true,
          grid: { visible: false, size: 24 },
          zoom: 0.8,
          panX: 0,
          panY: 0,
        };

        set({ document: newDoc });
        saveDocumentToIDB(newDoc);
        return;
      } catch (err: any) {
        console.error("JPL project import failed:", err);
        get().showNotification(`Failed to import project: ${err.message}`, "error");
        return;
      }
    }

    // Standard raster image import (PNG/JPG/JPEG/WebP/GIF/BMP and other browser-decodable images).
    // Place the source at its native pixel dimensions as a new layer in the
    // current document. The view may be zoomed, but the layer itself is never
    // downscaled or resized during import.
    try {
      if (!file.type.startsWith("image/")) {
        get().showNotification("Please choose a PNG, JPG, JPEG, WebP, GIF or other browser-supported image.", "warning");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = objectUrl;

        if (typeof img.decode === "function") {
          await img.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Browser could not decode this image."));
          });
        }

        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (!width || !height) throw new Error("Image has no usable dimensions.");

        // Canvas dimensions and layer dimensions stay exactly at the source
        // image's natural pixel size. There is intentionally no fit-to-screen
        // scaling and no drawImage resize operation here.
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) throw new Error("Could not create an image canvas.");

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);

        const layerId = `layer_imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const currentDoc = get().document;

        // Center the native-size layer inside the current document. Negative
        // coordinates are allowed when the source image is larger than the
        // document, just like placing an oversized image in a desktop editor.
        const x = Math.round((currentDoc.width - width) / 2);
        const y = Math.round((currentDoc.height - height) / 2);

        const newLayer: Layer = {
          id: layerId,
          name: file.name.substring(0, 80),
          type: "raster",
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "normal",
          x,
          y,
          width,
          height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          canvas,
          adjustments: getDefaultAdjustments(),
        };

        get().pushHistory("Place Image");

        const newDoc: PhotoDocument = {
          ...currentDoc,
          layers: [newLayer, ...currentDoc.layers],
          activeLayerId: layerId,
          selectedLayerIds: [layerId],
          // Keep the user's current zoom and pan. Importing an image must not
          // silently change how the document is viewed.
          zoom: currentDoc.zoom,
          panX: currentDoc.panX,
          panY: currentDoc.panY,
        };

        set({
          document: newDoc,
          activePanelTab: "layers",
        });

        try {
          await saveDocumentToIDB(newDoc);
        } catch (saveError) {
          console.warn("Image placed but session save failed:", saveError);
        }

        get().showNotification(
          `Placed ${file.name} at native size ${width} × ${height}px.`,
          "success"
        );
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err: any) {
      console.error("Image import failed:", err);
      get().showNotification(
        `Could not place image: ${err?.message || "unsupported or corrupted image"}`,
        "error"
      );
    },
  exportProject: () => {
    exportProjectJPL(get().document);
  },
}));

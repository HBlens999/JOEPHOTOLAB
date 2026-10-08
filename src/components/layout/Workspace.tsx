import React, { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "../../store/editorStore";
import { ToolType } from "../../types/document";
import { WebGLRenderer } from "../../engine/WebGLRenderer";
import { ColorPanel } from "./ColorPanel";

export const Workspace: React.FC = () => {
  const {
    document: doc,
    activeTool,
    brushSettings,
    cloneSettings,
    setCloneSettings,
    selection,
    perspectivePoints,
    setPerspectivePoint,
    setZoom,
    setPan,
    applyBrushStroke,
    applyCloneStroke,
    applyHealingStroke,
    applySpotHeal,
    addTextLayer,
    updateTextLayer,
    setActiveLayer,
    setBrushSettings,
    cropDocument,
    addShapeLayer,
    setRectSelection,
    setEllipseSelection,
    setPolygonSelection,
    setWandSelection,
    setLayerTransform,
    importFile,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  // For selection dragging
  const [selectionDragStart, setSelectionDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelectionRect, setCurrentSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<Array<{ x: number; y: number }>>([]);

  // For move tool layer dragging and interactive transform handles
  const [layerDragStart, setLayerDragStart] = useState<{ startX: number; startY: number; layerX: number; layerY: number } | null>(null);
  type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    layerX: number;
    layerY: number;
    width: number;
    height: number;
  } | null>(null);
  const strokeOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize WebGLRenderer
  useEffect(() => {
    if (viewportCanvasRef.current) {
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      rendererRef.current = new WebGLRenderer(viewportCanvasRef.current);
    }

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Re-render whenever document or active layer changes
  useEffect(() => {
    if (rendererRef.current && offscreenCanvasRef.current) {
      rendererRef.current.renderDocument(doc, offscreenCanvasRef.current);
    }
  }, [doc]);

  // Spacebar and Alt key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never turn characters typed into text/number inputs, textareas, or
      // contenteditable elements into editor shortcuts. This is critical for
      // text editing: typing "BOY" must produce BOY, not trigger B/O/Y tools.
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTypingTarget) {
        if (e.code === "Space" && !isSpacePressed) setIsSpacePressed(true);
        if (e.key === "Alt") setIsAltPressed(true);
        return;
      }

      if (e.code === "Space" && !isSpacePressed) {
        setIsSpacePressed(true);
      }
      if (e.key === "Alt") {
        setIsAltPressed(true);
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
        return;
      }
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        useEditorStore.getState().redo();
        return;
      }

      // Core editor shortcuts.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const shortcuts: Record<string, ToolType> = {
        v: "move", h: "pan", m: e.shiftKey ? "marquee-ellipse" : "marquee-rect",
        u: e.shiftKey ? "shape-ellipse" : "shape-rect",
        l: "lasso", w: "magic-wand", c: e.shiftKey ? "perspective-crop" : "crop",
        i: "eyedropper", j: e.shiftKey ? "healing" : "spot-healing",
        s: "clone", b: e.shiftKey ? "ai-detail-brush" : "brush",
        e: "eraser", t: "text", z: "zoom",
      };
      const nextTool = shortcuts[key];
      if (nextTool) {
        e.preventDefault();
        useEditorStore.getState().setTool(nextTool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
      if (e.key === "Alt") setIsAltPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  // Wheel Zoom centered at cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Mouse position in document coordinates
      const docX = (mouseX - rect.width / 2 - doc.panX) / doc.zoom + doc.width / 2;
      const docY = (mouseY - rect.height / 2 - doc.panY) / doc.zoom + doc.height / 2;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.min(32, Math.max(0.01, doc.zoom * zoomFactor));

      // Calculate new pan to keep docX, docY under cursor
      const newPanX = mouseX - rect.width / 2 - (docX - doc.width / 2) * newZoom;
      const newPanY = mouseY - rect.height / 2 - (docY - doc.height / 2) * newZoom;

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    },
    [doc.zoom, doc.panX, doc.panY, doc.width, doc.height, setZoom, setPan]
  );

  // Convert Client screen coordinates to Document pixel coordinates
  const clientToDocCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const x = (mouseX - rect.width / 2 - doc.panX) / doc.zoom + doc.width / 2;
      const y = (mouseY - rect.height / 2 - doc.panY) / doc.zoom + doc.height / 2;
      return { x: Math.round(x), y: Math.round(y) };
    },
    [doc.panX, doc.panY, doc.zoom, doc.width, doc.height]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) {
      setIsFileDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (Array.from(e.dataTransfer.items || []).some((item) => item.kind === "file")) {
      setIsFileDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsFileDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      if (files.length > 0) {
        useEditorStore.getState().showNotification("Drop an image file such as PNG, JPG, JPEG or WebP.", "warning");
      }
      return;
    }

    await importFile(imageFile);
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPointerDown(true);
    const { x, y } = clientToDocCoords(e.clientX, e.clientY);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Transform resize handles take priority over normal layer picking.
    if (resizeHandle) {
      return;
    }

    // Middle click or Spacebar held: Pan viewport
    if (e.button === 1 || isSpacePressed || activeTool === "pan") {
      return;
    }

    // Clone / Healing Alt+Click sets source point
    if ((activeTool === "clone" || activeTool === "healing") && (isAltPressed || e.altKey)) {
      setCloneSettings({ sourceX: x, sourceY: y });
      return;
    }

    // Zoom tool: click to zoom in around the pointer; Shift+click zooms out.
    if (activeTool === "zoom") {
      const factor = e.shiftKey ? 0.67 : 1.5;
      const newZoom = Math.min(32, Math.max(0.05, doc.zoom * factor));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const newPanX = mouseX - rect.width / 2 - (x - doc.width / 2) * newZoom;
        const newPanY = mouseY - rect.height / 2 - (y - doc.height / 2) * newZoom;
        setZoom(newZoom);
        setPan(newPanX, newPanY);
      }
      return;
    }

    // Eyedropper: sample the visible composite at the clicked document pixel.
    if (activeTool === "eyedropper") {
      const sampleCanvas = offscreenCanvasRef.current;
      const ctx = sampleCanvas?.getContext("2d");
      if (ctx && x >= 0 && y >= 0 && x < doc.width && y < doc.height) {
        const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        if (pixel[3] > 0) {
          const hex = "#" + [pixel[0], pixel[1], pixel[2]]
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("");
          setBrushSettings({ color: hex });
        }
      }
      return;
    }

    // Crop: drag a rectangular crop region.
    if (activeTool === "crop") {
      setSelectionDragStart({ x, y });
      setCurrentSelectionRect({ x, y, w: 0, h: 0 });
      return;
    }

    // Pick / Move tool: select the topmost visible layer under the cursor,
    // then drag that layer. This is the editor's primary pick tool.
    if (activeTool === "move") {
      // Layers are stored top-to-bottom, so hit-test from the first visible
      // layer to the last. Reversing this made backgrounds win over images.
      const hit = doc.layers
        .filter((layer) => layer.visible && !layer.locked)
        .find((layer) =>
          x >= layer.x &&
          x <= layer.x + layer.width &&
          y >= layer.y &&
          y <= layer.y + layer.height
        );
      if (hit) {
        setActiveLayer(hit.id);
        setLayerDragStart({
          startX: x,
          startY: y,
          layerX: hit.x,
          layerY: hit.y,
        });
      }
      return;
    }

    // Vector shape tools.
    if (activeTool === "shape-rect" || activeTool === "shape-ellipse") {
      setSelectionDragStart({ x, y });
      setCurrentSelectionRect({ x, y, w: 0, h: 0 });
      return;
    }

    // Text tool: select an existing text layer instead of creating another one.
    // A double-click then enters inline editing mode.
    if (activeTool === "text") {
      const hit = [...doc.layers]
        .reverse()
        .find((layer) =>
          layer.type === "text" &&
          layer.visible &&
          x >= layer.x &&
          x <= layer.x + layer.width &&
          y >= layer.y &&
          y <= layer.y + layer.height
        );

      if (hit) {
        setActiveLayer(hit.id);
      } else {
        addTextLayer(x, y);
      }
      return;
    }

    // Spot Healing
    if (activeTool === "spot-healing") {
      applySpotHeal(x, y);
      return;
    }

    // Magic Wand
    if (activeTool === "magic-wand") {
      setWandSelection(x, y, 32, true);
      return;
    }

    // Selections Drag Start
    if (["marquee-rect", "marquee-ellipse"].includes(activeTool)) {
      setSelectionDragStart({ x, y });
      setCurrentSelectionRect({ x, y, w: 0, h: 0 });
      return;
    }

    if (activeTool === "lasso") {
      setLassoPoints([{ x, y }]);
      return;
    }

    if (activeTool === "polygonal-lasso") {
      setLassoPoints((pts) => (pts.length === 0 ? [{ x, y }] : [...pts, { x, y }]));
      return;
    }

    if (activeTool === "quick-selection") {
      useEditorStore.getState().setEllipseSelection(x, y, brushSettings.size / 2, brushSettings.size / 2, "add");
      return;
    }

    // Brush / Eraser / AI Detail Brush
    if (["brush", "eraser", "ai-detail-brush", "clone", "healing"].includes(activeTool)) {
      strokeOriginRef.current = { x, y };
      if (activeTool === "brush") applyBrushStroke(x, y, x, y, false);
      else if (activeTool === "eraser") applyBrushStroke(x, y, x, y, true);
      else if (activeTool === "ai-detail-brush") {
        // AI Detail brush paints a temporary mask
        useEditorStore.getState().setEllipseSelection(x, y, brushSettings.size / 2, brushSettings.size / 2, "add");
      } else if (activeTool === "clone") applyCloneStroke(x, y, { x, y });
      else if (activeTool === "healing") applyHealingStroke(x, y, { x, y });
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = clientToDocCoords(e.clientX, e.clientY);
    setCursorPos({ x, y });

    if (!isPointerDown) return;

    // Pan viewport
    if (isSpacePressed || activeTool === "pan" || e.buttons === 4) {
      if (dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setPan(doc.panX + dx, doc.panY + dy);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    // Interactive resize: eight CorelDRAW-style nodes around the active object.
    if (resizeHandle && doc.activeLayerId && resizeStartRef.current) {
      const start = resizeStartRef.current;
      const dx = x - start.startX;
      const dy = y - start.startY;
      const preserveRatio = e.shiftKey;
      const ratio = start.width > 0 && start.height > 0 ? start.width / start.height : 1;
      const minSize = 8;

      let nextX = start.layerX;
      let nextY = start.layerY;
      let nextW = start.width;
      let nextH = start.height;

      switch (resizeHandle) {
        case "nw":
          nextW = Math.max(minSize, start.width - dx);
          nextH = Math.max(minSize, start.height - dy);
          nextX = start.layerX + start.width - nextW;
          nextY = start.layerY + start.height - nextH;
          break;
        case "n":
          nextH = Math.max(minSize, start.height - dy);
          nextY = start.layerY + start.height - nextH;
          break;
        case "ne":
          nextW = Math.max(minSize, start.width + dx);
          nextH = Math.max(minSize, start.height - dy);
          nextY = start.layerY + start.height - nextH;
          break;
        case "e":
          nextW = Math.max(minSize, start.width + dx);
          break;
        case "se":
          nextW = Math.max(minSize, start.width + dx);
          nextH = Math.max(minSize, start.height + dy);
          break;
        case "s":
          nextH = Math.max(minSize, start.height + dy);
          break;
        case "sw":
          nextW = Math.max(minSize, start.width - dx);
          nextH = Math.max(minSize, start.height + dy);
          nextX = start.layerX + start.width - nextW;
          break;
        case "w":
          nextW = Math.max(minSize, start.width - dx);
          nextX = start.layerX + start.width - nextW;
          break;
      }

      // Shift constrains corner resizing to the original aspect ratio.
      if (preserveRatio && ["nw", "ne", "se", "sw"].includes(resizeHandle)) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          nextH = Math.max(minSize, nextW / ratio);
        } else {
          nextW = Math.max(minSize, nextH * ratio);
        }

        if (resizeHandle === "nw" || resizeHandle === "sw") {
          nextX = start.layerX + start.width - nextW;
        }
        if (resizeHandle === "nw" || resizeHandle === "ne") {
          nextY = start.layerY + start.height - nextH;
        }
      }

      setLayerTransform(doc.activeLayerId, nextX, nextY, nextW, nextH);
      return;
    }

    // Move tool: Dragging active layer
    if (activeTool === "move" && layerDragStart && doc.activeLayerId) {
      const dx = x - layerDragStart.startX;
      const dy = y - layerDragStart.startY;
      setLayerTransform(doc.activeLayerId, layerDragStart.layerX + dx, layerDragStart.layerY + dy);
      return;
    }

    // Brush painting strokes
    if (["brush", "eraser", "clone", "healing", "ai-detail-brush"].includes(activeTool)) {
      if (dragStart) {
        const prev = clientToDocCoords(dragStart.x, dragStart.y);
        const origin = strokeOriginRef.current || { x, y };
        if (activeTool === "brush") applyBrushStroke(prev.x, prev.y, x, y, false);
        else if (activeTool === "eraser") applyBrushStroke(prev.x, prev.y, x, y, true);
        else if (activeTool === "ai-detail-brush") {
          useEditorStore.getState().setEllipseSelection(x, y, brushSettings.size / 2, brushSettings.size / 2, "add");
        } else if (activeTool === "clone") applyCloneStroke(x, y, origin);
        else if (activeTool === "healing") applyHealingStroke(x, y, origin);
      }
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Selection marquee drag
    if (selectionDragStart && ["marquee-rect", "marquee-ellipse", "crop", "shape-rect", "shape-ellipse"].includes(activeTool)) {
      let minX = Math.min(selectionDragStart.x, x);
      let minY = Math.min(selectionDragStart.y, y);
      let w = Math.abs(x - selectionDragStart.x);
      let h = Math.abs(y - selectionDragStart.y);

      // Shift-constrain the ellipse tool to a true circle, just like
      // Photoshop/CorelDRAW. Rectangle remains freeform.
      if (activeTool === "shape-ellipse" && e.shiftKey) {
        const size = Math.max(w, h);
        if (x < selectionDragStart.x) minX = selectionDragStart.x - size;
        if (y < selectionDragStart.y) minY = selectionDragStart.y - size;
        w = size;
        h = size;
      }

      setCurrentSelectionRect({ x: minX, y: minY, w, h });
      return;
    }

    // Lasso drawing
    if (activeTool === "lasso") {
      setLassoPoints((pts) => [...pts, { x, y }]);
    }
  };

  // Double-clicking an existing text layer enters inline editing.
  // Native dblclick follows the two click/pointer sequences, so the pointer-down
  // handler above must only select the existing layer, not create a new layer.
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (activeTool !== "text") return;
    const { x, y } = clientToDocCoords(e.clientX, e.clientY);
    const hit = [...doc.layers]
      .reverse()
      .find((layer) =>
        layer.type === "text" &&
        layer.visible &&
        x >= layer.x &&
        x <= layer.x + layer.width &&
        y >= layer.y &&
        y <= layer.y + layer.height
      );
    if (hit) {
      setActiveLayer(hit.id);
      setEditingTextLayerId(hit.id);
    }
  };

  const handleWorkspaceDoubleClick = (e: React.MouseEvent) => {
    if (activeTool !== "polygonal-lasso" || lassoPoints.length < 3) return;
    e.stopPropagation();
    setPolygonSelection(lassoPoints, "new");
    setLassoPoints([]);
  };

  // Pointer Up
  const handlePointerUp = () => {
    setIsPointerDown(false);
    setDragStart(null);
    setLayerDragStart(null);
    setResizeHandle(null);
    resizeStartRef.current = null;
    strokeOriginRef.current = null;

    if ((activeTool === "shape-rect" || activeTool === "shape-ellipse") && selectionDragStart && currentSelectionRect) {
      if (currentSelectionRect.w >= 2 && currentSelectionRect.h >= 2) {
        addShapeLayer(
          activeTool === "shape-ellipse" ? "ellipse" : "rectangle",
          currentSelectionRect.x,
          currentSelectionRect.y,
          currentSelectionRect.w,
          currentSelectionRect.h
        );
      }
      setSelectionDragStart(null);
      setCurrentSelectionRect(null);
      return;
    }

    // Commit crop before normal marquee selection handling.
    if (activeTool === "crop" && selectionDragStart && currentSelectionRect) {
      if (currentSelectionRect.w >= 2 && currentSelectionRect.h >= 2) {
        cropDocument(
          currentSelectionRect.x,
          currentSelectionRect.y,
          currentSelectionRect.w,
          currentSelectionRect.h
        );
      }
      setSelectionDragStart(null);
      setCurrentSelectionRect(null);
      return;
    }

    // Polygonal lasso commits on double-click; pointer-up only ends the current click.
    // Commit marquee selection
    if (selectionDragStart && currentSelectionRect) {
      if (activeTool === "marquee-rect") {
        setRectSelection(
          currentSelectionRect.x,
          currentSelectionRect.y,
          currentSelectionRect.w,
          currentSelectionRect.h
        );
      } else if (activeTool === "marquee-ellipse") {
        const rx = currentSelectionRect.w / 2;
        const ry = currentSelectionRect.h / 2;
        setEllipseSelection(
          currentSelectionRect.x + rx,
          currentSelectionRect.y + ry,
          rx,
          ry
        );
      }
      setSelectionDragStart(null);
      setCurrentSelectionRect(null);
    }

    // Commit lasso selection
    if (activeTool === "lasso" && lassoPoints.length > 2) {
      setPolygonSelection(lassoPoints);
      setLassoPoints([]);
    }
  };

  const activeLayer = doc.layers.find((l) => l.id === doc.activeLayerId);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={(e) => { handleDoubleClick(e); handleWorkspaceDoubleClick(e); }}
      className={`app-workspace flex-1 relative overflow-hidden bg-[#0d0e12] flex items-center justify-center ${isFileDragOver ? "ring-2 ring-inset ring-cyan-400" : ""}`}
      style={{
        touchAction: "none",
        cursor:
          isSpacePressed || activeTool === "pan"
            ? (isPointerDown ? "grabbing" : "grab")
            : activeTool === "move"
              ? "move"
              : activeTool === "text"
                ? "text"
                : activeTool === "zoom"
                  ? "zoom-in"
                  : activeTool === "crop" || activeTool === "perspective-crop"
                    ? "crosshair"
                    : ["marquee-rect", "marquee-ellipse", "lasso", "magic-wand", "quick-selection", "polygonal-lasso", "eyedropper"].includes(activeTool)
                      ? "crosshair"
                      : ["brush", "eraser", "clone", "healing", "spot-healing", "ai-detail-brush"].includes(activeTool)
                        ? "crosshair"
                        : "default",
      }}
    >
      {/* Viewport Canvas Container */}
      <div
        className="app-canvas-frame relative shadow-2xl transition-transform duration-75 ease-out select-none"
        style={{
          width: doc.width,
          height: doc.height,
          transform: `translate(${doc.panX}px, ${doc.panY}px) scale(${doc.zoom})`,
          transformOrigin: "center center",
        }}
      >
        {isFileDragOver && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-cyan-500/10 border-2 border-dashed border-cyan-400">
            <div className="px-6 py-4 rounded-xl bg-black/80 text-white text-sm font-semibold shadow-2xl">
              Drop image to open in JoePhotoLab
            </div>
          </div>
        )}

        {/* White document surface. Transparency is still represented by
            the document's actual backgroundColor; the default editor document
            is intentionally white, not the old dark checkerboard. */}
        <div
          className="absolute inset-0 pointer-events-none bg-white"
          style={{
            backgroundColor:
              doc.backgroundColor && doc.backgroundColor !== "transparent"
                ? doc.backgroundColor
                : "#ffffff",
          }}
        />

        {/* Primary WebGL2 Canvas */}
        <canvas
          ref={viewportCanvasRef}
          width={doc.width}
          height={doc.height}
          className="absolute inset-0 block w-full h-full"
        />

        {/* Active Selection Marching Ants Overlay */}
        {selection.active && selection.maskCanvas && (
          <div className="absolute inset-0 pointer-events-none mix-blend-difference">
            <svg className="w-full h-full">
              <rect
                x={selection.bounds?.x || 0}
                y={selection.bounds?.y || 0}
                width={selection.bounds?.width || doc.width}
                height={selection.bounds?.height || doc.height}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.5 / doc.zoom}
                strokeDasharray={`${4 / doc.zoom}, ${4 / doc.zoom}`}
                className="animate-pulse"
              />
            </svg>
          </div>
        )}

        {/* Temporary Marquee Drag Box */}
        {currentSelectionRect && (
          <div
            className="absolute border border-dashed border-cyan-400 bg-cyan-500/10 pointer-events-none"
            style={{
              left: currentSelectionRect.x,
              top: currentSelectionRect.y,
              width: currentSelectionRect.w,
              height: currentSelectionRect.h,
            }}
          />
        )}

        {/* Active Layer Bounding Box & Transform Handles */}
        {activeTool === "move" && activeLayer && (
          <div
            className="absolute border border-cyan-400/80 pointer-events-none"
            style={{
              left: activeLayer.x,
              top: activeLayer.y,
              width: activeLayer.width,
              height: activeLayer.height,
            }}
          >
            {([
              "nw", "n", "ne", "e", "se", "s", "sw", "w"
            ] as const).map((handle) => {
              const positionClass: Record<ResizeHandle, string> = {
                nw: "-top-2 -left-2",
                n: "-top-2 left-1/2 -translate-x-1/2",
                ne: "-top-2 -right-2",
                e: "top-1/2 -right-2 -translate-y-1/2",
                se: "-bottom-2 -right-2",
                s: "-bottom-2 left-1/2 -translate-x-1/2",
                sw: "-bottom-2 -left-2",
                w: "top-1/2 -left-2 -translate-y-1/2",
              };
              const cursor: Record<ResizeHandle, string> = {
                nw: "nwse-resize",
                n: "ns-resize",
                ne: "nesw-resize",
                e: "ew-resize",
                se: "nwse-resize",
                s: "ns-resize",
                sw: "nesw-resize",
                w: "ew-resize",
              };

              return (
                <div
                  key={handle}
                  className={`absolute ${positionClass[handle]} w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-cyan-600 rounded-sm pointer-events-auto touch-none`}
                  style={{ cursor: cursor[handle] }}
                  role="button"
                  aria-label={`Resize ${handle} handle`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const layer = useEditorStore.getState().document.layers.find(
                      (item) => item.id === activeLayer.id
                    );
                    if (!layer || layer.locked) return;

                    const start = clientToDocCoords(e.clientX, e.clientY);
                    resizeStartRef.current = {
                      startX: start.x,
                      startY: start.y,
                      layerX: layer.x,
                      layerY: layer.y,
                      width: layer.width,
                      height: layer.height,
                    };
                    setResizeHandle(handle);
                    setIsPointerDown(true);
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Perspective Correction 4 Draggable Handles */}
        {activeTool === "perspective-crop" && perspectivePoints && (
          <svg className="absolute inset-0 w-full h-full pointer-events-auto">
            {/* Connecting lines */}
            <polygon
              points={perspectivePoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth={2 / doc.zoom}
              strokeDasharray={`${6 / doc.zoom}, ${6 / doc.zoom}`}
            />
            {/* Interactive Corner Knobs */}
            {perspectivePoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={8 / doc.zoom}
                fill="#ffffff"
                stroke="#0891b2"
                strokeWidth={2 / doc.zoom}
                className="cursor-move hover:scale-125 transition-transform"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const startClientX = e.clientX;
                  const startClientY = e.clientY;
                  const initX = pt.x;
                  const initY = pt.y;

                  const handleMove = (ev: PointerEvent) => {
                    const dx = (ev.clientX - startClientX) / doc.zoom;
                    const dy = (ev.clientY - startClientY) / doc.zoom;
                    setPerspectivePoint(idx, Math.round(initX + dx), Math.round(initY + dy));
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
        )}

        {/* Clone Stamp Sampling Source Crosshair */}
        {cloneSettings.sourceX !== null && cloneSettings.sourceY !== null && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: cloneSettings.sourceX,
              top: cloneSettings.sourceY,
            }}
          >
            <div className="w-5 h-5 rounded-full border border-amber-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            </div>
          </div>
        )}
        {editingTextLayerId && (() => {
          const editingLayer = doc.layers.find((l) => l.id === editingTextLayerId && l.type === "text");
          if (!editingLayer?.textProps) return null;
          return (
            <textarea
              autoFocus
              value={editingLayer.textProps.text}
              onChange={(e) => updateTextLayer(editingLayer.id, { text: e.target.value })}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => setEditingTextLayerId(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setEditingTextLayerId(null);
                  return;
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute z-30 resize-none overflow-hidden border border-cyan-400 bg-black/20 outline-none"
              style={{
                left: editingLayer.x,
                top: editingLayer.y,
                width: Math.max(240, editingLayer.width),
                minHeight: editingLayer.height,
                color: editingLayer.textProps.fill,
                fontFamily: editingLayer.textProps.fontFamily,
                fontSize: editingLayer.textProps.fontSize,
                fontWeight: editingLayer.textProps.fontWeight,
                fontStyle: editingLayer.textProps.fontStyle,
                lineHeight: editingLayer.textProps.lineHeight,
                textAlign: editingLayer.textProps.align,
                letterSpacing: editingLayer.textProps.letterSpacing,
                background: "rgba(0,0,0,0.15)",
              }}
            />
          );
        })()}
      </div>

      {/* Always-visible CorelDRAW-style color palette */}
      <ColorPanel />

      {/* Rulers / Viewport Pixel Coordinate HUD */}
      <div className="absolute bottom-2 left-3 bg-[#161820]/90 backdrop-blur-sm border border-[#2b303c] rounded px-2 py-0.5 text-[10px] text-[#8e95a5] font-mono tabular-nums flex items-center gap-2 pointer-events-none">
        <span>X: {cursorPos.x}px</span>
        <span>Y: {cursorPos.y}px</span>
        <span aria-hidden="true">·</span>
        <span>Zoom: {Math.round(doc.zoom * 100)}%</span>
      </div>
    </div>
  );
};

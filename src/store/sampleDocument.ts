import { PhotoDocument, Layer, getDefaultAdjustments } from "../types/document";

/**
 * Creates the default initial document for Joephotolab.
 * Generates an elegant high-resolution photo composition so all creative tools,
 * curves, retouching, and adjustments are immediately interactive.
 */
export function createDefaultDocument(): PhotoDocument {
  const width = 1920;
  const height = 1080;

  // Start JoePhotoLab with a clean, editable white artboard.
  // The user can immediately create shapes, text, paint, or import an image.
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d")!;
  bgCtx.fillStyle = "#ffffff";
  bgCtx.fillRect(0, 0, width, height);

  const backgroundLayer: Layer = {
    id: "layer_background",
    name: "Background",
    type: "raster",
    visible: true,
    locked: true,
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

  return {
    id: "doc_default_init",
    name: "Untitled-1.jpl",
    width,
    height,
    resolution: 300,
    colorSpace: "sRGB",
    bitDepth: 8,
    backgroundColor: "#ffffff",
    layers: [backgroundLayer],
    activeLayerId: null,
    selectedLayerIds: [],
    guides: [],
    rulers: true,
    grid: { visible: false, size: 24 },
    zoom: 0.8,
    panX: 0,
    panY: 0,
  };
}

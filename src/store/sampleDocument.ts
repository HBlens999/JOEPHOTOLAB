import { PhotoDocument, Layer, getDefaultAdjustments } from "../types/document";

/**
 * Creates the default initial document for Joephotolab.
 * Generates an elegant high-resolution photo composition so all creative tools,
 * curves, retouching, and adjustments are immediately interactive.
 */
export function createDefaultDocument(): PhotoDocument {
  const width = 1920;
  const height = 1080;

  // 1. Create Base Landscape Background Layer Canvas
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d")!;

  // Render cinematic mountain & golden hour sky
  const skyGrad = bgCtx.createLinearGradient(0, 0, 0, height * 0.7);
  skyGrad.addColorStop(0, "#1c2e4a"); // Deep navy zenith
  skyGrad.addColorStop(0.3, "#3a4c6a");
  skyGrad.addColorStop(0.65, "#d67c54"); // Amber horizon
  skyGrad.addColorStop(0.85, "#f3b063"); // Golden glow
  skyGrad.addColorStop(1, "#f9d89c");
  bgCtx.fillStyle = skyGrad;
  bgCtx.fillRect(0, 0, width, height);

  // Distant mountain ranges
  bgCtx.fillStyle = "#2c3447";
  bgCtx.beginPath();
  bgCtx.moveTo(0, height * 0.65);
  bgCtx.lineTo(width * 0.2, height * 0.48);
  bgCtx.lineTo(width * 0.45, height * 0.58);
  bgCtx.lineTo(width * 0.7, height * 0.42);
  bgCtx.lineTo(width * 0.88, height * 0.52);
  bgCtx.lineTo(width, height * 0.45);
  bgCtx.lineTo(width, height);
  bgCtx.lineTo(0, height);
  bgCtx.closePath();
  bgCtx.fill();

  // Closer mountain ridges
  bgCtx.fillStyle = "#1e2430";
  bgCtx.beginPath();
  bgCtx.moveTo(0, height * 0.72);
  bgCtx.lineTo(width * 0.28, height * 0.62);
  bgCtx.lineTo(width * 0.55, height * 0.7);
  bgCtx.lineTo(width * 0.82, height * 0.58);
  bgCtx.lineTo(width, height * 0.66);
  bgCtx.lineTo(width, height);
  bgCtx.lineTo(0, height);
  bgCtx.closePath();
  bgCtx.fill();

  // Foreground lake with golden reflections
  const waterGrad = bgCtx.createLinearGradient(0, height * 0.72, 0, height);
  waterGrad.addColorStop(0, "#18202c");
  waterGrad.addColorStop(0.4, "#243346");
  waterGrad.addColorStop(0.7, "#35475e");
  waterGrad.addColorStop(1, "#1c2635");
  bgCtx.fillStyle = waterGrad;
  bgCtx.fillRect(0, height * 0.72, width, height * 0.28);

  // Shimmering reflection ripples
  bgCtx.fillStyle = "rgba(243, 176, 99, 0.25)";
  for (let i = 0; i < 40; i++) {
    const rx = width * 0.4 + (Math.random() - 0.5) * width * 0.35;
    const ry = height * 0.74 + Math.random() * height * 0.24;
    const rw = 40 + Math.random() * 120;
    bgCtx.fillRect(rx, ry, rw, 2.5);
  }

  // 2. Create Foreground Studio Subject Layer (Silhouetted Pine Trees & Cabin)
  const fgCanvas = document.createElement("canvas");
  fgCanvas.width = width;
  fgCanvas.height = height;
  const fgCtx = fgCanvas.getContext("2d")!;

  fgCtx.fillStyle = "#11161d";
  // Left pine grove
  function drawPine(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number, w: number) {
    ctx.beginPath();
    ctx.moveTo(x, baseY - h);
    ctx.lineTo(x + w * 0.5, baseY - h * 0.4);
    ctx.lineTo(x + w * 0.35, baseY - h * 0.4);
    ctx.lineTo(x + w * 0.7, baseY);
    ctx.lineTo(x - w * 0.7, baseY);
    ctx.lineTo(x - w * 0.35, baseY - h * 0.4);
    ctx.lineTo(x - w * 0.5, baseY - h * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  drawPine(fgCtx, 160, height * 0.88, 380, 160);
  drawPine(fgCtx, 260, height * 0.9, 440, 180);
  drawPine(fgCtx, 380, height * 0.92, 320, 140);
  drawPine(fgCtx, width - 200, height * 0.88, 400, 170);
  drawPine(fgCtx, width - 320, height * 0.92, 310, 130);

  // Shoreline rocks
  fgCtx.beginPath();
  fgCtx.ellipse(180, height * 0.93, 240, 50, 0, 0, Math.PI * 2);
  fgCtx.fill();

  // Layers Array
  const backgroundLayer: Layer = {
    id: "layer_background",
    name: "Golden Hour Vista",
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

  const foregroundLayer: Layer = {
    id: "layer_foreground",
    name: "Pine Forest Silhouette",
    type: "raster",
    visible: true,
    locked: false,
    opacity: 0.95,
    blendMode: "normal",
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    canvas: fgCanvas,
    adjustments: getDefaultAdjustments(),
  };

  const textLayer: Layer = {
    id: "layer_text_title",
    name: "Title Typography",
    type: "text",
    visible: true,
    locked: false,
    opacity: 0.9,
    blendMode: "normal",
    x: 100,
    y: 120,
    width: 800,
    height: 140,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    textProps: {
      text: "JOEPHOTOLAB",
      fontSize: 64,
      fontFamily: "Plus Jakarta Sans",
      fill: "#ffffff",
      fontWeight: "bold",
      fontStyle: "normal",
      letterSpacing: 4,
      lineHeight: 1.1,
      align: "left",
    },
  };

  return {
    id: "doc_default_init",
    name: "Alpine_Summit_Raw.dng",
    width,
    height,
    resolution: 300,
    colorSpace: "sRGB",
    bitDepth: 8,
    backgroundColor: "#121316",
    layers: [backgroundLayer, foregroundLayer, textLayer],
    activeLayerId: foregroundLayer.id,
    selectedLayerIds: [foregroundLayer.id],
    guides: [],
    rulers: true,
    grid: { visible: false, size: 24 },
    zoom: 0.8,
    panX: 0,
    panY: 0,
    rawMetadata: {
      cameraMake: "Sony",
      cameraModel: "ILCE-7RM5",
      iso: 100,
      shutterSpeed: "1/500s",
      aperture: "f/4.0",
      focalLength: "24mm",
      whiteBalancePreset: "Daylight (5500K)",
    },
    rawAdjustments: {
      exposure: 0,
      temperature: 5,
      tint: -2,
      highlights: -15,
      shadows: 20,
      whites: 5,
      blacks: -10,
      contrast: 10,
      clarity: 15,
      dehaze: 8,
      vibrance: 12,
      saturation: 5,
      sharpening: 40,
      noiseReduction: 15,
    },
  };
}

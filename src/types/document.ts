export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

export type LayerType =
  | "raster"
  | "text"
  | "group"
  | "adjustment"
  | "ai"
  | "mask";

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ChannelLevels {
  black: number; // 0 to 255
  gamma: number; // 0.1 to 9.99 (default 1.0)
  white: number; // 0 to 255
  outBlack: number; // 0 to 255
  outWhite: number; // 0 to 255
}

export interface HSLChannel {
  hue: number; // -180 to 180
  sat: number; // -100 to 100
  lum: number; // -100 to 100
}

export interface ColorBalanceTonal {
  cyanRed: number; // -100 to 100
  magentaGreen: number; // -100 to 100
  yellowBlue: number; // -100 to 100
}

export interface AdjustmentSettings {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  exposure: number; // -5 to +5
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  temperature: number; // -100 to 100
  tint: number; // -100 to 100
  saturation: number; // -100 to 100
  vibrance: number; // -100 to 100
  sharpness: number; // 0 to 100
  noiseReduction: number; // 0 to 100
  blur: number; // 0 to 50
  vignette: {
    amount: number; // -100 to 100
    midpoint: number; // 0 to 100
    roundness: number; // -100 to 100
    feather: number; // 0 to 100
  };
  levels: {
    rgb: ChannelLevels;
    red: ChannelLevels;
    green: ChannelLevels;
    blue: ChannelLevels;
  };
  curves: {
    rgb: CurvePoint[];
    red: CurvePoint[];
    green: CurvePoint[];
    blue: CurvePoint[];
  };
  hsl: {
    master: HSLChannel;
    reds: HSLChannel;
    oranges: HSLChannel;
    yellows: HSLChannel;
    greens: HSLChannel;
    aquas: HSLChannel;
    blues: HSLChannel;
    purples: HSLChannel;
    magentas: HSLChannel;
  };
  colorBalance: {
    shadows: ColorBalanceTonal;
    midtones: ColorBalanceTonal;
    highlights: ColorBalanceTonal;
    preserveLuminosity: boolean;
  };
}

export interface LayerMask {
  canvas: HTMLCanvasElement;
  enabled: boolean;
  inverted: boolean;
  feather: number;
  opacity: number;
}

export interface TextProperties {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right";
}

export interface AILayerMetadata {
  generated: true;
  provider: string;
  model: string;
  operation: string;
  promptVersion: string;
  sourceLayerId: string;
  createdAt: string;
  aiBlendStrength: number; // 0 to 100%
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;

  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;

  canvas?: HTMLCanvasElement; // For raster / ai layers
  mask?: LayerMask;
  textProps?: TextProperties;
  adjustments?: AdjustmentSettings;
  aiMetadata?: AILayerMetadata;

  children?: Layer[]; // For group layers
}

export interface RAWMetadata {
  cameraMake?: string;
  cameraModel?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: string;
  whiteBalancePreset?: string;
  lensModel?: string;
}

export interface RAWAdjustments {
  exposure: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  contrast: number;
  clarity: number;
  dehaze: number;
  vibrance: number;
  saturation: number;
  sharpening: number;
  noiseReduction: number;
}

export interface PhotoDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  resolution: number;
  colorSpace: "sRGB" | "Display-P3" | "AdobeRGB";
  bitDepth: 8 | 16;
  backgroundColor: string;

  layers: Layer[];
  activeLayerId: string | null;
  selectedLayerIds: string[];

  guides: Array<{ orientation: "horizontal" | "vertical"; position: number }>;
  rulers: boolean;
  grid: { visible: boolean; size: number };

  zoom: number; // e.g. 1.0 = 100%
  panX: number;
  panY: number;

  rawMetadata?: RAWMetadata;
  rawAdjustments?: RAWAdjustments;
  rawSourceBuffer?: ArrayBuffer;
}

export type ToolType =
  | "move"
  | "pan"
  | "zoom"
  | "crop"
  | "perspective-crop"
  | "brush"
  | "eraser"
  | "clone"
  | "healing"
  | "spot-healing"
  | "ai-detail-brush"
  | "marquee-rect"
  | "marquee-ellipse"
  | "lasso"
  | "polygonal-lasso"
  | "magic-wand"
  | "quick-selection"
  | "text"
  | "eyedropper";

export interface BrushSettings {
  size: number;
  hardness: number; // 0 to 1
  opacity: number; // 0 to 1
  flow: number; // 0 to 1
  smoothing: number;
  color: string;
}

export interface CloneSettings {
  sourceX: number | null;
  sourceY: number | null;
  aligned: boolean;
  sampleMode: "current" | "current-below" | "all";
}

export interface PerspectivePoint {
  x: number;
  y: number;
}

export interface SelectionState {
  active: boolean;
  maskCanvas: HTMLCanvasElement | null;
  bounds: { x: number; y: number; width: number; height: number } | null;
  feather: number;
}

export function getDefaultAdjustments(): AdjustmentSettings {
  return {
    brightness: 0,
    contrast: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    temperature: 0,
    tint: 0,
    saturation: 0,
    vibrance: 0,
    sharpness: 0,
    noiseReduction: 0,
    blur: 0,
    vignette: {
      amount: 0,
      midpoint: 50,
      roundness: 0,
      feather: 50,
    },
    levels: {
      rgb: { black: 0, gamma: 1.0, white: 255, outBlack: 0, outWhite: 255 },
      red: { black: 0, gamma: 1.0, white: 255, outBlack: 0, outWhite: 255 },
      green: { black: 0, gamma: 1.0, white: 255, outBlack: 0, outWhite: 255 },
      blue: { black: 0, gamma: 1.0, white: 255, outBlack: 0, outWhite: 255 },
    },
    curves: {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    },
    hsl: {
      master: { hue: 0, sat: 0, lum: 0 },
      reds: { hue: 0, sat: 0, lum: 0 },
      oranges: { hue: 0, sat: 0, lum: 0 },
      yellows: { hue: 0, sat: 0, lum: 0 },
      greens: { hue: 0, sat: 0, lum: 0 },
      aquas: { hue: 0, sat: 0, lum: 0 },
      blues: { hue: 0, sat: 0, lum: 0 },
      purples: { hue: 0, sat: 0, lum: 0 },
      magentas: { hue: 0, sat: 0, lum: 0 },
    },
    colorBalance: {
      shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
      preserveLuminosity: true,
    },
  };
}

# Joephotolab

A high-performance, browser-based professional photo editor built with WebGL 2.0, React, TypeScript, and a server-side Gemini AI processing pipeline.

---

## 1. Architecture Overview

Joephotolab is designed as a full-stack professional creative editing application:

```
Joephotolab/
├── client/ (Vite + React 19 + TypeScript + Zustand + Tailwind CSS)
│   ├── engine/
│   │   ├── WebGLRenderer.ts     # GPU shader-accelerated layer compositor & adjustments
│   │   ├── curvesSpline.ts      # Monotone cubic Hermite spline evaluation
│   │   ├── histogram.ts         # Multi-channel downsampled histogram calculation
│   │   ├── retouch.ts           # Pixel-level Clone Stamp & Poisson healing algorithms
│   │   ├── selections.ts        # Marquee, lasso, and flood-fill tolerance selections
│   │   ├── rawDecoder.ts        # RAW DNG/CR2/ARW parser & linear development pipeline
│   │   └── exportFormats.ts     # Uncompressed TIFF & Photoshop PSD binary encoders
│   ├── store/
│   │   ├── editorStore.ts       # Unified Zustand document & tool state
│   │   └── persistence.ts       # IndexedDB autosave & .jpl document serialization
│   └── components/
│       ├── layout/              # TopBar, ToolOptionsBar, LeftToolbar, Workspace
│       ├── panels/              # Layers, Adjustments, AI Engine, Retouch, RAW
│       └── dialogs/             # Export, New Document, Image Size, RAW Development
└── server/ (Node.js + Express + Google GenAI SDK)
    ├── routes/ai.ts             # Micro-texture synthesis, relighting, smart segmentation
    ├── ai/GeminiProvider.ts     # Server-side provider abstraction
    └── ai/jobManager.ts         # Asynchronous job queue & progress tracker
```

---

## 2. Features

### Core Editor
- **WebGL 2.0 Rendering Engine**: GPU-accelerated layer compositing with opacity, masks, transforms, and blend modes (`normal`, `multiply`, `screen`, `overlay`, `soft-light`, `darken`, `lighten`, `color-dodge`, `color-burn`).
- **Canvas Fallback**: Seamless 2D Canvas pipeline when WebGL2 is not available or upon context loss.
- **Document Model**: Multi-layer document state with raster layers, editable typography layers, and AI overlays.
- **Zoom & Pan Engine**: 1% to 3200% zoom preserving cursor position, spacebar + drag pan, and middle-mouse navigation.

### Professional Color & Tonal Adjustments (Non-Destructive)
- **Exposure & Tone**: Exposure EV ($2^{\text{EV}}$), Highlights, Shadows, Brightness, and Contrast.
- **Levels**: Master RGB and discrete Red, Green, and Blue channel adjustments with interactive Black Point, Gamma power curve ($x^{1/\gamma}$), White Point, and live histogram.
- **Curves**: Interactive 256×256 spline curve graph with cubic Hermite interpolation, multi-channel selection (RGB, R, G, B), draggable control points, and live histogram underlay.
- **HSL Color Mixer**: 8 distinct chromatic bands (Reds, Oranges, Yellows, Greens, Aquas, Blues, Purples, Magentas, and Master) with hue shift, saturation, and luminance.
- **Color Balance**: Shadows, Midtones, and Highlights with Cyan-Red, Magenta-Green, and Yellow-Blue controls with luminosity preservation.
- **White Balance**: Color temperature and tint controls.
- **Sharpening, Noise Reduction, Gaussian Blur, and Vignette**.

### Retouching Suite
- **Clone Stamp Tool**: Real raster copying with source coordinate locking (Alt+Click), aligned/non-aligned modes, and sampling across current layer or all visible layers.
- **Healing Brush**: Texture cloning with destination luminance preservation and feathered falloff.
- **Spot Healing Brush**: One-click automatic blemish and sensor dust removal via boundary annular patch interpolation.
- **4-Corner Perspective Homography**: Straighten converging lines and architectural angles using projective quadrilaterals.

### RAW Processing Pipeline
- Support for DNG, CR2, CR3, NEF, ARW, RAF, ORF, and RW2 files.
- Reads EXIF camera metadata (ISO, Shutter Speed, Aperture, Focal Length, Camera Make & Model).
- Linear sensor development pipeline: Exposure EV, White Balance temperature/tint, Highlight recovery, Shadow lift, Contrast, Clarity, Dehaze, and Filmic tone mapping.

### Selections & Masks
- Rectangular and Elliptical Marquees.
- Freehand and Polygonal Lassos.
- Magic Wand with flood-fill tolerance and contiguous mode.
- Gaussian blur feathering, inversion, and layer mask conversion.

### File Formats & Export
- **Import**: PNG, JPEG, WebP, TIFF, RAW (DNG, CR2, NEF, ARW, etc.), and `.jpl` projects.
- **Export Formats**: PNG, JPEG (quality slider), WebP (quality slider), TIFF (uncompressed 32-bit RGBA TIFF binary), and Adobe Photoshop PSD (8BPS multi-layer file structure).
- **Scale Modes**: 1× (Original), 2×, 4×, and 8K UHD (7680×4320 preserving aspect ratio).
- **Persistence**: Continuous background autosave to browser IndexedDB and downloadable `.jpl` project files.

### Joephotolab AI Engine
- **8K Neural Micro-Texture Synthesis**: High-frequency procedural texture enhancement (Skin Pores, Fabric Weave, Hair/Beard Detail, Metallic Gloss, Natural Vegetation, and Custom Prompts) preserving facial geometry and composition.
- **Dynamic Studio Relighting**: 360° interactive light direction dial, highlight intensity, light softness, rim light contouring, and eye catchlight enhancement.
- **AI Detail Paint**: Brush-targeted localized high-frequency detail synthesis on masked regions.
- **AI Smart Selections**: Neural segmentation for Subject, Background, Sky, People, Hair, and Objects.
- **Asynchronous Job Architecture**: Polling queue with progress tracking, non-blocking UI, and retry recovery.

---

## 3. Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```

---

## 4. Environment Variables

Configure environment variables in `.env` (refer to `.env.example`):
- `GEMINI_API_KEY`: Google Gemini API key used by the backend proxy.
- `PORT`: HTTP port (defaults to 3000).
- `APP_URL`: Hosted application URL.

*Note: The frontend never accesses `GEMINI_API_KEY` directly; all AI operations route securely through `/api/ai/*`.*

import { Layer, BlendMode, getDefaultAdjustments } from "../types/document";

export interface ParsedPSDResult {
  width: number;
  height: number;
  layers: Layer[];
}

/**
 * Decodes PackBits RLE compressed byte stream.
 */
function decodePackBits(view: DataView, offset: number, decompressedLength: number): { data: Uint8Array; nextOffset: number } {
  const output = new Uint8Array(decompressedLength);
  let outPos = 0;
  let inPos = offset;

  while (outPos < decompressedLength) {
    const flag = view.getInt8(inPos);
    inPos++;

    if (flag >= 0) {
      // Copy next (flag + 1) literal bytes
      const count = flag + 1;
      for (let i = 0; i < count && outPos < decompressedLength; i++) {
        output[outPos++] = view.getUint8(inPos++);
      }
    } else if (flag >= -127) {
      // Repeat next byte (1 - flag) times
      const count = 1 - flag;
      const val = view.getUint8(inPos++);
      for (let i = 0; i < count && outPos < decompressedLength; i++) {
        output[outPos++] = val;
      }
    }
    // flag === -128 is a no-op in standard PackBits
  }

  return { data: output, nextOffset: inPos };
}

/**
 * Parses Adobe Photoshop (.psd) files into Joephotolab layers and canvases.
 */
export async function parsePSD(buffer: ArrayBuffer): Promise<ParsedPSDResult> {
  const view = new DataView(buffer);

  // 1. Header (26 bytes)
  const sig = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  if (sig !== "8BPS") {
    throw new Error("Invalid PSD file: missing 8BPS signature");
  }

  const version = view.getUint16(4);
  if (version !== 1) {
    throw new Error(`Unsupported PSD version: ${version}`);
  }

  const height = view.getUint32(14);
  const width = view.getUint32(18);
  const depth = view.getUint16(22);
  const colorMode = view.getUint16(24); // 3 = RGB

  if (colorMode !== 3 && colorMode !== 1) {
    throw new Error(`PSD Color mode ${colorMode} is not supported. RGB required.`);
  }

  let offset = 26;

  // 2. Color Mode Data Section
  const colorModeLen = view.getUint32(offset);
  offset += 4 + colorModeLen;

  // 3. Image Resources Section
  const imgResLen = view.getUint32(offset);
  offset += 4 + imgResLen;

  // 4. Layer and Mask Information Section
  const layerAndMaskLen = view.getUint32(offset);
  const layerAndMaskStart = offset + 4;
  offset += 4;

  if (layerAndMaskLen === 0) {
    throw new Error("PSD file contains no layer information");
  }

  // Layer info length
  const layerInfoLen = view.getUint32(offset);
  offset += 4;

  if (layerInfoLen === 0) {
    throw new Error("No separate layers found in PSD");
  }

  const rawLayerCount = view.getInt16(offset);
  const layerCount = Math.abs(rawLayerCount);
  offset += 2;

  interface LayerRecordInfo {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
    channelCount: number;
    channels: Array<{ id: number; length: number }>;
    blendMode: BlendMode;
    opacity: number;
    visible: boolean;
    name: string;
  }

  const records: LayerRecordInfo[] = [];

  const blendKeyMap: Record<string, BlendMode> = {
    norm: "normal",
    "mul ": "multiply",
    scrn: "screen",
    over: "overlay",
    sLit: "soft-light",
    dark: "darken",
    lite: "lighten",
    "div ": "color-dodge",
    idiv: "color-burn",
  };

  // Read Layer Records
  for (let i = 0; i < layerCount; i++) {
    const top = view.getInt32(offset);
    const left = view.getInt32(offset + 4);
    const bottom = view.getInt32(offset + 8);
    const right = view.getInt32(offset + 12);
    const lW = Math.max(0, right - left);
    const lH = Math.max(0, bottom - top);
    const channelCount = view.getUint16(offset + 16);
    offset += 18;

    const channels: Array<{ id: number; length: number }> = [];
    for (let c = 0; c < channelCount; c++) {
      const chId = view.getInt16(offset);
      const chLen = view.getUint32(offset + 2);
      channels.push({ id: chId, length: chLen });
      offset += 6;
    }

    // Signature 8BIM
    offset += 4;

    // Blend mode key (4 chars)
    const blendKey = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const blendMode = blendKeyMap[blendKey] || "normal";
    offset += 4;

    // Opacity
    const opacity = view.getUint8(offset) / 255.0;
    offset += 1;

    // Clipping & Flags
    offset += 1; // clipping
    const flags = view.getUint8(offset);
    const visible = (flags & (1 << 1)) === 0;
    offset += 2; // flags + filler

    // Extra data length
    const extraLen = view.getUint32(offset);
    const extraEnd = offset + 4 + extraLen;
    offset += 4;

    // Layer mask data length
    const maskLen = view.getUint32(offset);
    offset += 4 + maskLen;

    // Layer blending ranges length
    const blendRangesLen = view.getUint32(offset);
    offset += 4 + blendRangesLen;

    // Layer name (Pascal string)
    const nameLen = view.getUint8(offset);
    offset += 1;
    let name = "";
    for (let n = 0; n < nameLen; n++) {
      name += String.fromCharCode(view.getUint8(offset + n));
    }
    offset += nameLen;

    offset = extraEnd; // skip to end of record

    records.push({
      top,
      left,
      bottom,
      right,
      width: lW,
      height: lH,
      channelCount,
      channels,
      blendMode,
      opacity,
      visible,
      name: name || `Layer ${i + 1}`,
    });
  }

  // Read Channel Image Data for each layer
  const layers: Layer[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const lW = rec.width;
    const lH = rec.height;

    // Default empty transparent canvas if zero dimension
    const lCanvas = document.createElement("canvas");
    lCanvas.width = Math.max(1, lW);
    lCanvas.height = Math.max(1, lH);
    const ctx = lCanvas.getContext("2d");

    if (lW > 0 && lH > 0 && ctx) {
      const channelBytesMap: Record<number, Uint8Array> = {};

      for (const ch of rec.channels) {
        const compression = view.getUint16(offset);
        offset += 2;

        if (compression === 0) {
          // Raw uncompressed
          const chData = new Uint8Array(buffer, offset, lW * lH);
          channelBytesMap[ch.id] = chData;
          offset += lW * lH;
        } else if (compression === 1) {
          // PackBits RLE: skip row byte counts
          offset += lH * 2;
          const { data, nextOffset } = decodePackBits(view, offset, lW * lH);
          channelBytesMap[ch.id] = data;
          offset = nextOffset;
        } else {
          // Unsupported compression; skip
          offset += ch.length - 2;
        }
      }

      // Reconstruct RGBA Image Data
      const imgData = ctx.createImageData(lW, lH);
      const d = imgData.data;
      const rPlane = channelBytesMap[0];
      const gPlane = channelBytesMap[1];
      const bPlane = channelBytesMap[2];
      const aPlane = channelBytesMap[-1];

      const pixelCount = lW * lH;
      for (let pi = 0; pi < pixelCount; pi++) {
        const idx = pi * 4;
        d[idx] = rPlane ? rPlane[pi] : 0;
        d[idx + 1] = gPlane ? gPlane[pi] : 0;
        d[idx + 2] = bPlane ? bPlane[pi] : 0;
        d[idx + 3] = aPlane ? aPlane[pi] : 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    layers.push({
      id: `layer_psd_${Date.now()}_${i}`,
      name: rec.name,
      type: "raster",
      visible: rec.visible,
      locked: false,
      opacity: rec.opacity,
      blendMode: rec.blendMode,
      x: rec.left,
      y: rec.top,
      width: Math.max(1, lW),
      height: Math.max(1, lH),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      canvas: lCanvas,
      adjustments: getDefaultAdjustments(),
    });
  }

  return {
    width,
    height,
    layers,
  };
}

import { PhotoDocument, Layer } from "../types/document";

/**
 * Encodes an RGBA canvas into an uncompressed standard TIFF (Tagged Image File Format) binary Blob.
 */
export function encodeTIFF(canvas: HTMLCanvasElement): Blob {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d canvas context for TIFF export");

  const imgData = ctx.getImageData(0, 0, width, height);
  const rgba = imgData.data;
  const pixelBytes = rgba.length; // width * height * 4

  // TIFF Layout:
  // 0..7: Header (8 bytes)
  // 8..8+pixelBytes-1: Strip Data (pixelBytes)
  // Afterwards: Extra arrays (BitsPerSample, XRes, YRes)
  // Finally: IFD
  const stripOffset = 8;
  const extraOffset = stripOffset + pixelBytes;

  // Extra data:
  // BitsPerSample: 4 x SHORT (8, 8, 8, 8) = 8 bytes
  // XResolution: 2 x LONG (300, 1) = 8 bytes
  // YResolution: 2 x LONG (300, 1) = 8 bytes
  // ExtraSamples: 1 x SHORT (2 = unassociated alpha)
  const bitsPerSampleOffset = extraOffset;
  const xResOffset = bitsPerSampleOffset + 8;
  const yResOffset = xResOffset + 8;
  const ifdOffset = yResOffset + 8;

  const numEntries = 13;
  const ifdSize = 2 + numEntries * 12 + 4;
  const totalSize = ifdOffset + ifdSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. Header (Little Endian "II")
  view.setUint16(0, 0x4949, true); // "II"
  view.setUint16(2, 42, true); // Version 42
  view.setUint32(4, ifdOffset, true); // IFD Offset

  // 2. Strip Data
  bytes.set(rgba, stripOffset);

  // 3. Extra Data Values
  // BitsPerSample [8, 8, 8, 8]
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  // XResolution (300 / 1)
  view.setUint32(xResOffset, 300, true);
  view.setUint32(xResOffset + 4, 1, true);

  // YResolution (300 / 1)
  view.setUint32(yResOffset, 300, true);
  view.setUint32(yResOffset + 4, 1, true);

  // 4. IFD Entries
  let entryPos = ifdOffset;
  view.setUint16(entryPos, numEntries, true);
  entryPos += 2;

  function writeTag(tag: number, type: number, count: number, valOrOffset: number) {
    view.setUint16(entryPos, tag, true);
    view.setUint16(entryPos + 2, type, true);
    view.setUint32(entryPos + 4, count, true);
    view.setUint32(entryPos + 8, valOrOffset, true);
    entryPos += 12;
  }

  writeTag(0x0100, 4, 1, width); // ImageWidth (LONG)
  writeTag(0x0101, 4, 1, height); // ImageLength (LONG)
  writeTag(0x0102, 3, 4, bitsPerSampleOffset); // BitsPerSample (SHORT, count 4)
  writeTag(0x0103, 3, 1, 1); // Compression (1 = uncompressed)
  writeTag(0x0106, 3, 1, 2); // PhotometricInterpretation (2 = RGB)
  writeTag(0x0111, 4, 1, stripOffset); // StripOffsets
  writeTag(0x0115, 3, 1, 4); // SamplesPerPixel (4)
  writeTag(0x0116, 4, 1, height); // RowsPerStrip
  writeTag(0x0117, 4, 1, pixelBytes); // StripByteCounts
  writeTag(0x011a, 5, 1, xResOffset); // XResolution (RATIONAL)
  writeTag(0x011b, 5, 1, yResOffset); // YResolution (RATIONAL)
  writeTag(0x0128, 3, 1, 2); // ResolutionUnit (2 = inch)
  writeTag(0x0152, 3, 1, 2); // ExtraSamples (2 = unassociated alpha)

  // Next IFD offset = 0 (none)
  view.setUint32(entryPos, 0, true);

  return new Blob([buffer], { type: "image/tiff" });
}

/**
 * Encodes document layers into standard Adobe Photoshop (.psd) binary format.
 */
export function encodePSD(doc: PhotoDocument, compositeCanvas: HTMLCanvasElement): Blob {
  const width = doc.width;
  const height = doc.height;
  const compCtx = compositeCanvas.getContext("2d");
  if (!compCtx) throw new Error("Failed to get composite canvas context");

  const compData = compCtx.getImageData(0, 0, width, height).data;
  const pixelCount = width * height;

  // Separate channels for composite image
  const compR = new Uint8Array(pixelCount);
  const compG = new Uint8Array(pixelCount);
  const compB = new Uint8Array(pixelCount);
  const compA = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    compR[i] = compData[idx];
    compG[i] = compData[idx + 1];
    compB[i] = compData[idx + 2];
    compA[i] = compData[idx + 3];
  }

  // 1. Header (26 bytes)
  const headerBuf = new ArrayBuffer(26);
  const hView = new DataView(headerBuf);
  // '8BPS'
  hView.setUint8(0, 0x38);
  hView.setUint8(1, 0x42);
  hView.setUint8(2, 0x50);
  hView.setUint8(3, 0x53);
  hView.setUint16(4, 1); // Version 1
  // 6 reserved bytes
  hView.setUint16(12, 4); // Channels = 4 (R, G, B, A)
  hView.setUint32(14, height);
  hView.setUint32(18, width);
  hView.setUint16(22, 8); // Depth = 8-bit
  hView.setUint16(24, 3); // ColorMode = RGB (3)

  // 2. Color Mode Data Section (4 bytes length = 0)
  const colorModeBuf = new ArrayBuffer(4);
  new DataView(colorModeBuf).setUint32(0, 0);

  // 3. Image Resources Section (Empty or minimal 4 bytes length)
  const imgResBuf = new ArrayBuffer(4);
  new DataView(imgResBuf).setUint32(0, 0);

  // 4. Layer and Mask Information Section
  // For each raster layer, encode Layer Record
  const rasterLayers = doc.layers.filter((l) => l.canvas && l.visible);
  const layerCount = rasterLayers.length;

  let layerInfoChunks: Uint8Array[] = [];

  if (layerCount > 0) {
    // Structure:
    // 4 bytes: Section Length
    // 4 bytes: Layer Info Length
    // 2 bytes: Layer Count (signed)
    let layerRecordsLen = 0;
    const records: Array<{ layer: Layer; nameBytes: Uint8Array }> = [];

    for (const lyr of rasterLayers) {
      const name = lyr.name || "Layer";
      const nameBytes = new TextEncoder().encode(name.substring(0, 31));
      const paddedNameLen = 1 + nameBytes.length;
      const pad = (4 - (paddedNameLen % 4)) % 4;
      const totalNameFieldLen = paddedNameLen + pad;

      // Record: 16 (bounds) + 2 (channels) + 6 * channels (6 * 4 = 24) + 4 (sig) + 4 (blend) + 1 (opacity) + 1 (clipping) + 1 (flags) + 1 (filler) + 4 (extra length) + 4 (mask) + 4 (blend ranges) + totalNameFieldLen
      const recordSize = 16 + 2 + 24 + 4 + 4 + 1 + 1 + 1 + 1 + 4 + 4 + 4 + totalNameFieldLen;
      layerRecordsLen += recordSize;
      records.push({ layer: lyr, nameBytes });
    }

    // Allocate Layer Records buffer
    const recordsBuf = new ArrayBuffer(layerRecordsLen);
    const rView = new DataView(recordsBuf);
    let rOffset = 0;

    // Blend mode keys
    const blendMap: Record<string, string> = {
      normal: "norm",
      multiply: "mul ",
      screen: "scrn",
      overlay: "over",
      "soft-light": "sLit",
      darken: "dark",
      lighten: "lite",
      "color-dodge": "div ",
      "color-burn": "idiv",
    };

    const channelPixelDataChunks: Uint8Array[] = [];

    for (const { layer, nameBytes } of records) {
      const lW = layer.width || width;
      const lH = layer.height || height;
      const lTop = Math.round(layer.y || 0);
      const lLeft = Math.round(layer.x || 0);
      const lBottom = lTop + lH;
      const lRight = lLeft + lW;

      rView.setInt32(rOffset, lTop);
      rView.setInt32(rOffset + 4, lLeft);
      rView.setInt32(rOffset + 8, lBottom);
      rView.setInt32(rOffset + 12, lRight);
      rView.setUint16(rOffset + 16, 4); // 4 channels: R, G, B, A
      rOffset += 18;

      // Channel info: R (0), G (1), B (2), A (-1 transparency)
      const chLen = 2 + lW * lH; // 2 bytes compression header + raw bytes
      const channels = [
        { id: 0, len: chLen },
        { id: 1, len: chLen },
        { id: 2, len: chLen },
        { id: -1, len: chLen },
      ];

      for (const ch of channels) {
        rView.setInt16(rOffset, ch.id);
        rView.setUint32(rOffset + 2, ch.len);
        rOffset += 6;
      }

      // '8BIM' signature
      rView.setUint8(rOffset, 0x38);
      rView.setUint8(rOffset + 1, 0x42);
      rView.setUint8(rOffset + 2, 0x49);
      rView.setUint8(rOffset + 3, 0x4d);
      rOffset += 4;

      // Blend mode
      const key = blendMap[layer.blendMode] || "norm";
      for (let k = 0; k < 4; k++) {
        rView.setUint8(rOffset + k, key.charCodeAt(k));
      }
      rOffset += 4;

      // Opacity
      rView.setUint8(rOffset, Math.round((layer.opacity ?? 1) * 255));
      // Clipping (0 = base), Flags (0), Filler (0)
      rView.setUint8(rOffset + 1, 0);
      rView.setUint8(rOffset + 2, 0);
      rView.setUint8(rOffset + 3, 0);
      rOffset += 4;

      // Extra data length
      const paddedNameLen = 1 + nameBytes.length;
      const pad = (4 - (paddedNameLen % 4)) % 4;
      const totalNameFieldLen = paddedNameLen + pad;
      const extraLen = 4 + 4 + totalNameFieldLen; // mask (4) + blend ranges (4) + name
      rView.setUint32(rOffset, extraLen);
      rOffset += 4;

      // Layer mask data length = 0
      rView.setUint32(rOffset, 0);
      rOffset += 4;
      // Layer blending ranges length = 0
      rView.setUint32(rOffset, 0);
      rOffset += 4;

      // Pascal string name
      rView.setUint8(rOffset, nameBytes.length);
      rOffset += 1;
      new Uint8Array(recordsBuf).set(nameBytes, rOffset);
      rOffset += nameBytes.length;
      for (let p = 0; p < pad; p++) {
        rView.setUint8(rOffset + p, 0);
      }
      rOffset += pad;

      // Channel image data for this layer
      const lCanvas = layer.canvas!;
      const lCtx = lCanvas.getContext("2d");
      const lImgData = lCtx ? lCtx.getImageData(0, 0, lW, lH).data : new Uint8ClampedArray(lW * lH * 4);
      const lPixelCount = lW * lH;

      const chR = new Uint8Array(2 + lPixelCount);
      const chG = new Uint8Array(2 + lPixelCount);
      const chB = new Uint8Array(2 + lPixelCount);
      const chA = new Uint8Array(2 + lPixelCount);

      // Raw uncompressed compression type = 0
      chR[0] = 0; chR[1] = 0;
      chG[0] = 0; chG[1] = 0;
      chB[0] = 0; chB[1] = 0;
      chA[0] = 0; chA[1] = 0;

      for (let pi = 0; pi < lPixelCount; pi++) {
        const sIdx = pi * 4;
        chR[2 + pi] = lImgData[sIdx];
        chG[2 + pi] = lImgData[sIdx + 1];
        chB[2 + pi] = lImgData[sIdx + 2];
        chA[2 + pi] = lImgData[sIdx + 3];
      }

      channelPixelDataChunks.push(chR, chG, chB, chA);
    }

    // Build Layer Info header
    const layerInfoHeader = new ArrayBuffer(6);
    const lihView = new DataView(layerInfoHeader);
    lihView.setInt16(0, layerCount); // Layer count
    // layerRecordsLen + sum(channels)

    let totalChannelDataLen = 0;
    for (const chunk of channelPixelDataChunks) {
      totalChannelDataLen += chunk.byteLength;
    }

    const layerInfoContentLen = 2 + layerRecordsLen + totalChannelDataLen;
    // Pad to 2 bytes
    const pad2 = layerInfoContentLen % 2 === 1 ? 1 : 0;
    const finalLayerInfoLen = 4 + layerInfoContentLen + pad2;

    const layerSecHeader = new ArrayBuffer(8);
    const lshView = new DataView(layerSecHeader);
    lshView.setUint32(0, finalLayerInfoLen);
    lshView.setUint32(4, layerInfoContentLen);

    const layerSecParts: Uint8Array[] = [
      new Uint8Array(layerSecHeader),
      new Uint8Array(layerInfoHeader),
      new Uint8Array(recordsBuf),
      ...channelPixelDataChunks,
    ];
    if (pad2 > 0) layerSecParts.push(new Uint8Array(1));

    layerInfoChunks = layerSecParts;
  } else {
    const emptySec = new ArrayBuffer(4);
    new DataView(emptySec).setUint32(0, 0);
    layerInfoChunks = [new Uint8Array(emptySec)];
  }

  // 5. Global Image Data Section
  // 2 bytes compression (0 = raw)
  // Followed by R plane, G plane, B plane, A plane
  const compHeader = new ArrayBuffer(2);
  new DataView(compHeader).setUint16(0, 0); // Raw uncompressed

  const parts: BlobPart[] = [
    headerBuf,
    colorModeBuf,
    imgResBuf,
    ...layerInfoChunks.map((c) => c.buffer as ArrayBuffer),
    compHeader,
    compR.buffer as ArrayBuffer,
    compG.buffer as ArrayBuffer,
    compB.buffer as ArrayBuffer,
    compA.buffer as ArrayBuffer,
  ];

  return new Blob(parts, { type: "image/vnd.adobe.photoshop" });
}

/**
 * Resizes a canvas to target resolution (1x, 2x, 4x, or 8K 7680x4320 preserving aspect ratio)
 */
export function scaleCanvasToTarget(
  sourceCanvas: HTMLCanvasElement,
  scaleMode: "1x" | "2x" | "4x" | "8k"
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  let targetW = srcW;
  let targetH = srcH;

  switch (scaleMode) {
    case "1x":
      targetW = srcW;
      targetH = srcH;
      break;
    case "2x":
      targetW = srcW * 2;
      targetH = srcH * 2;
      break;
    case "4x":
      targetW = srcW * 4;
      targetH = srcH * 4;
      break;
    case "8k": {
      // 8K standard: max dimension 7680
      const maxDim = 7680;
      if (srcW >= srcH) {
        targetW = maxDim;
        targetH = Math.round((srcH / srcW) * maxDim);
      } else {
        targetH = maxDim;
        targetW = Math.round((srcW / srcH) * maxDim);
      }
      break;
    }
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
  return outCanvas;
}

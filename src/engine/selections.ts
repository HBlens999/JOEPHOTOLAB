export interface SelectionMask {
  width: number;
  height: number;
  data: Uint8Array; // 0 to 255 for each pixel
}

/**
 * Creates a blank selection mask
 */
export function createSelectionMask(width: number, height: number): SelectionMask {
  return {
    width,
    height,
    data: new Uint8Array(width * height),
  };
}

/**
 * Fill rectangular selection
 */
export function selectRect(
  mask: SelectionMask,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: "new" | "add" | "subtract" = "new"
) {
  const minX = Math.max(0, Math.min(mask.width - 1, Math.round(x)));
  const maxX = Math.max(0, Math.min(mask.width - 1, Math.round(x + width)));
  const minY = Math.max(0, Math.min(mask.height - 1, Math.round(y)));
  const maxY = Math.max(0, Math.min(mask.height - 1, Math.round(y + height)));

  if (mode === "new") {
    mask.data.fill(0);
  }

  const fillVal = mode === "subtract" ? 0 : 255;

  for (let py = minY; py <= maxY; py++) {
    const rowOffset = py * mask.width;
    for (let px = minX; px <= maxX; px++) {
      mask.data[rowOffset + px] = fillVal;
    }
  }
}

/**
 * Fill elliptical selection
 */
export function selectEllipse(
  mask: SelectionMask,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  mode: "new" | "add" | "subtract" = "new"
) {
  if (mode === "new") {
    mask.data.fill(0);
  }

  const fillVal = mode === "subtract" ? 0 : 255;
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(mask.width - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(mask.height - 1, Math.ceil(cy + ry));

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  if (rx2 === 0 || ry2 === 0) return;

  for (let py = minY; py <= maxY; py++) {
    const dy = py - cy;
    const dy2 = dy * dy;
    const rowOffset = py * mask.width;

    for (let px = minX; px <= maxX; px++) {
      const dx = px - cx;
      if (dx * dx / rx2 + dy2 / ry2 <= 1.0) {
        mask.data[rowOffset + px] = fillVal;
      }
    }
  }
}

/**
 * Polygonal or freehand lasso selection using point-in-polygon scanline
 */
export function selectPolygon(
  mask: SelectionMask,
  points: Array<{ x: number; y: number }>,
  mode: "new" | "add" | "subtract" = "new"
) {
  if (points.length < 3) return;

  if (mode === "new") {
    mask.data.fill(0);
  }

  const fillVal = mode === "subtract" ? 0 : 255;

  // Find bounding box
  let minX = mask.width;
  let maxX = 0;
  let minY = mask.height;
  let maxY = 0;

  for (const pt of points) {
    if (pt.x < minX) minX = Math.floor(pt.x);
    if (pt.x > maxX) maxX = Math.ceil(pt.x);
    if (pt.y < minY) minY = Math.floor(pt.y);
    if (pt.y > maxY) maxY = Math.ceil(pt.y);
  }

  minX = Math.max(0, minX);
  maxX = Math.min(mask.width - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(mask.height - 1, maxY);

  const n = points.length;

  for (let py = minY; py <= maxY; py++) {
    const rowOffset = py * mask.width;
    for (let px = minX; px <= maxX; px++) {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;

        const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }

      if (inside) {
        mask.data[rowOffset + px] = fillVal;
      }
    }
  }
}

/**
 * Magic Wand selection: flood fill with color tolerance
 */
export function selectMagicWand(
  mask: SelectionMask,
  imageCtx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  tolerance: number = 32,
  contiguous: boolean = true,
  mode: "new" | "add" | "subtract" = "new"
) {
  if (mode === "new") {
    mask.data.fill(0);
  }

  const fillVal = mode === "subtract" ? 0 : 255;
  const width = mask.width;
  const height = mask.height;

  const imgData = imageCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetIdx = (Math.round(startY) * width + Math.round(startX)) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  function matches(idx: number): boolean {
    const dr = Math.abs(data[idx] - tr);
    const dg = Math.abs(data[idx + 1] - tg);
    const db = Math.abs(data[idx + 2] - tb);
    const da = Math.abs(data[idx + 3] - ta);
    return Math.max(dr, dg, db, da) <= tolerance;
  }

  if (!contiguous) {
    for (let i = 0; i < width * height; i++) {
      if (matches(i * 4)) {
        mask.data[i] = fillVal;
      }
    }
    return;
  }

  // Breadth-first flood fill
  const visited = new Uint8Array(width * height);
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  queueX[qTail] = Math.round(startX);
  queueY[qTail] = Math.round(startY);
  qTail++;
  visited[Math.round(startY) * width + Math.round(startX)] = 1;

  while (qHead < qTail) {
    const cx = queueX[qHead];
    const cy = queueY[qHead];
    qHead++;

    const pIdx = cy * width + cx;
    mask.data[pIdx] = fillVal;

    // Check 4 neighbors
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (let n = 0; n < 4; n++) {
      const nx = neighbors[n][0];
      const ny = neighbors[n][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          if (matches(nIdx * 4)) {
            queueX[qTail] = nx;
            queueY[qTail] = ny;
            qTail++;
          }
        }
      }
    }
  }
}

/**
 * Invert selection mask
 */
export function invertSelectionMask(mask: SelectionMask) {
  for (let i = 0; i < mask.data.length; i++) {
    mask.data[i] = 255 - mask.data[i];
  }
}

/**
 * Feather selection using separable 1D Gaussian filter
 */
export function featherSelectionMask(mask: SelectionMask, radius: number): SelectionMask {
  if (radius <= 0) return mask;

  const width = mask.width;
  const height = mask.height;
  const temp = new Float32Array(width * height);
  const result = new Uint8Array(width * height);

  const r = Math.ceil(radius);
  const kernelSize = r * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  const sigma = radius / 2.5;
  let sum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - r;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) {
        const nx = Math.max(0, Math.min(width - 1, x + k));
        acc += mask.data[yOffset + nx] * kernel[k + r];
      }
      temp[yOffset + x] = acc;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) {
        const ny = Math.max(0, Math.min(height - 1, y + k));
        acc += temp[ny * width + x] * kernel[k + r];
      }
      result[y * width + x] = Math.round(Math.min(255, Math.max(0, acc)));
    }
  }

  return { width, height, data: result };
}

/**
 * Converts SelectionMask to an HTMLCanvasElement
 */
export function maskToCanvas(mask: SelectionMask): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(mask.width, mask.height);
  const d = imgData.data;

  for (let i = 0; i < mask.data.length; i++) {
    const val = mask.data[i];
    const idx = i * 4;
    d[idx] = val;
    d[idx + 1] = val;
    d[idx + 2] = val;
    d[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Deletes selected pixels from active layer canvas
 */
export function deleteSelectedPixels(
  layerCanvas: HTMLCanvasElement,
  selectionCanvas: HTMLCanvasElement
) {
  const ctx = layerCanvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(selectionCanvas, 0, 0);
  ctx.restore();
}

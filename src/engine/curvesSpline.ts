import { CurvePoint } from "../types/document";

/**
 * Generates a 256-entry lookup table (LUT) from curve points using monotonic cubic spline interpolation.
 */
export function buildCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);

  if (!points || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  // Sort points by x coordinate
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // If single point, flat fill
  if (sorted.length === 1) {
    const val = Math.max(0, Math.min(255, Math.round(sorted[0].y)));
    lut.fill(val);
    return lut;
  }

  // Pre-fill before first point and after last point
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const n = sorted.length;
  const x = sorted.map((p) => p.x);
  const y = sorted.map((p) => p.y);

  // Monotone cubic Hermite interpolation
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const deltaX = Math.max(0.0001, x[i + 1] - x[i]);
    const deltaY = y[i + 1] - y[i];
    dx.push(deltaX);
    dy.push(deltaY);
    m.push(deltaY / deltaX);
  }

  // Tangents at internal points
  const tangents: number[] = new Array(n).fill(0);
  tangents[0] = m[0];
  tangents[n - 1] = m[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (m[i - 1] + m[i]) / 2;
    }
  }

  // Evaluate curve for all integer values 0..255
  for (let i = 0; i < 256; i++) {
    if (i <= first.x) {
      lut[i] = Math.max(0, Math.min(255, Math.round(first.y)));
      continue;
    }
    if (i >= last.x) {
      lut[i] = Math.max(0, Math.min(255, Math.round(last.y)));
      continue;
    }

    // Find interval
    let k = 0;
    while (k < n - 1 && x[k + 1] < i) {
      k++;
    }

    const h = dx[k];
    const t = (i - x[k]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const val = h00 * y[k] + h10 * h * tangents[k] + h01 * y[k + 1] + h11 * h * tangents[k + 1];
    lut[i] = Math.max(0, Math.min(255, Math.round(val)));
  }

  return lut;
}

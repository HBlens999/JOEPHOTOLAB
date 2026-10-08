import { PerspectivePoint } from "../types/document";

/**
 * Solves an 8x8 linear system A * x = B via Gaussian elimination with partial pivoting.
 */
function solveGaussian(A: number[][], B: number[]): number[] {
  const n = 8;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], B[i]]);
  }

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    if (Math.abs(M[i][i]) < 1e-12) continue;

    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
  }
  return x;
}

/**
 * Computes the 3x3 Projective Homography matrix mapping 4 points from src to dst.
 */
export function getHomographyMatrix(
  src: PerspectivePoint[],
  dst: PerspectivePoint[]
): number[] {
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    // Equation for X: sx*h0 + sy*h1 + h2 - dx*sx*h6 - dx*sy*h7 = dx
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    B.push(dx);

    // Equation for Y: sx*h3 + sy*h4 + h5 - dy*sx*h6 - dy*sy*h7 = dy
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    B.push(dy);
  }

  const h = solveGaussian(A, B);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Inverts a 3x3 matrix.
 */
export function invert3x3(m: number[]): number[] {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;

  const c00 = m11 * m22 - m12 * m21;
  const c01 = -(m10 * m22 - m12 * m20);
  const c02 = m10 * m21 - m11 * m20;

  const c10 = -(m01 * m22 - m02 * m21);
  const c11 = m00 * m22 - m02 * m20;
  const c12 = -(m00 * m21 - m01 * m20);

  const c20 = m01 * m12 - m02 * m11;
  const c21 = -(m00 * m12 - m02 * m10);
  const c22 = m00 * m11 - m01 * m10;

  const det = m00 * c00 + m01 * c01 + m02 * c02;
  if (Math.abs(det) < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];

  const invDet = 1.0 / det;
  // Transpose of cofactor matrix divided by det
  return [
    c00 * invDet, c10 * invDet, c20 * invDet,
    c01 * invDet, c11 * invDet, c21 * invDet,
    c02 * invDet, c12 * invDet, c22 * invDet,
  ];
}

/**
 * Applies genuine Projective Homography rectification to an image canvas.
 * Straightens the quadrilateral defined by 4 corner points into a clean rectangular output.
 */
export function rectifyPerspective(
  sourceCanvas: HTMLCanvasElement,
  quadPoints: PerspectivePoint[]
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const sCtx = sourceCanvas.getContext("2d");
  if (!sCtx) return sourceCanvas;

  const srcImageData = sCtx.getImageData(0, 0, srcW, srcH);
  const sData = srcImageData.data;

  // Calculate destination rectangle dimensions based on average quad width & height
  const topW = Math.hypot(quadPoints[1].x - quadPoints[0].x, quadPoints[1].y - quadPoints[0].y);
  const botW = Math.hypot(quadPoints[2].x - quadPoints[3].x, quadPoints[2].y - quadPoints[3].y);
  const leftH = Math.hypot(quadPoints[3].x - quadPoints[0].x, quadPoints[3].y - quadPoints[0].y);
  const rightH = Math.hypot(quadPoints[2].x - quadPoints[1].x, quadPoints[2].y - quadPoints[1].y);

  const dstW = Math.max(10, Math.round((topW + botW) / 2));
  const dstH = Math.max(10, Math.round((leftH + rightH) / 2));

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dCtx = dstCanvas.getContext("2d");
  if (!dCtx) return sourceCanvas;

  const dstImageData = dCtx.createImageData(dstW, dstH);
  const dData = dstImageData.data;

  // Destination corners: (0,0), (dstW,0), (dstW,dstH), (0,dstH)
  const rectDst: PerspectivePoint[] = [
    { x: 0, y: 0 },
    { x: dstW, y: 0 },
    { x: dstW, y: dstH },
    { x: 0, y: dstH },
  ];

  // We map from dst rectangle (x, y) back into quad source points (u, v)
  // Therefore, src = rectDst, dst = quadPoints
  const H = getHomographyMatrix(rectDst, quadPoints);

  // Subpixel Bilinear Interpolation helper
  function sampleBilinear(u: number, v: number): [number, number, number, number] {
    if (u < 0 || u >= srcW - 1 || v < 0 || v >= srcH - 1) {
      if (u >= -0.5 && u <= srcW - 0.5 && v >= -0.5 && v <= srcH - 0.5) {
        const cx = Math.max(0, Math.min(srcW - 1, Math.round(u)));
        const cy = Math.max(0, Math.min(srcH - 1, Math.round(v)));
        const idx = (cy * srcW + cx) * 4;
        return [sData[idx], sData[idx + 1], sData[idx + 2], sData[idx + 3]];
      }
      return [0, 0, 0, 0];
    }

    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const fx = u - x0;
    const fy = v - y0;
    const ifx = 1.0 - fx;
    const ify = 1.0 - fy;

    const w00 = ifx * ify;
    const w10 = fx * ify;
    const w01 = ifx * fy;
    const w11 = fx * fy;

    const idx00 = (y0 * srcW + x0) * 4;
    const idx10 = (y0 * srcW + x1) * 4;
    const idx01 = (y1 * srcW + x0) * 4;
    const idx11 = (y1 * srcW + x1) * 4;

    const r = w00 * sData[idx00] + w10 * sData[idx10] + w01 * sData[idx01] + w11 * sData[idx11];
    const g = w00 * sData[idx00 + 1] + w10 * sData[idx10 + 1] + w01 * sData[idx01 + 1] + w11 * sData[idx11 + 1];
    const b = w00 * sData[idx00 + 2] + w10 * sData[idx10 + 2] + w01 * sData[idx01 + 2] + w11 * sData[idx11 + 2];
    const a = w00 * sData[idx00 + 3] + w10 * sData[idx10 + 3] + w01 * sData[idx01 + 3] + w11 * sData[idx11 + 3];

    return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
  }

  for (let y = 0; y < dstH; y++) {
    const rowOffset = y * dstW * 4;
    for (let x = 0; x < dstW; x++) {
      // Map (x, y) to (u, v)
      const wPrime = H[6] * x + H[7] * y + H[8];
      if (Math.abs(wPrime) < 1e-9) continue;
      const invW = 1.0 / wPrime;
      const u = (H[0] * x + H[1] * y + H[2]) * invW;
      const v = (H[3] * x + H[4] * y + H[5]) * invW;

      const [r, g, b, a] = sampleBilinear(u, v);
      const idx = rowOffset + x * 4;
      dData[idx] = r;
      dData[idx + 1] = g;
      dData[idx + 2] = b;
      dData[idx + 3] = a;
    }
  }

  dCtx.putImageData(dstImageData, 0, 0);
  return dstCanvas;
}

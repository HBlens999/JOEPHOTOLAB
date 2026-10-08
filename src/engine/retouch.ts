export interface BrushStrokeOptions {
  radius: number;
  hardness: number; // 0 to 1
  opacity: number; // 0 to 1
  flow: number; // 0 to 1
}

/**
 * Real Clone Stamp implementation copying actual source pixels to destination.
 */
export function applyCloneStamp(
  destCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  srcX: number,
  srcY: number,
  destX: number,
  destY: number,
  options: BrushStrokeOptions
) {
  const r = Math.max(1, Math.round(options.radius));
  const diameter = r * 2;

  // Extract source patch
  const srcStartX = Math.round(srcX - r);
  const srcStartY = Math.round(srcY - r);

  const offscreen = document.createElement("canvas");
  offscreen.width = diameter;
  offscreen.height = diameter;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  offCtx.drawImage(
    sourceCanvas,
    srcStartX,
    srcStartY,
    diameter,
    diameter,
    0,
    0,
    diameter,
    diameter
  );

  // Apply radial hardness mask
  offCtx.globalCompositeOperation = "destination-in";
  const grad = offCtx.createRadialGradient(r, r, r * options.hardness, r, r, r);
  grad.addColorStop(0, `rgba(0, 0, 0, ${options.opacity * options.flow})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  offCtx.fillStyle = grad;
  offCtx.fillRect(0, 0, diameter, diameter);

  // Draw into destination
  destCtx.save();
  destCtx.drawImage(offscreen, destX - r, destY - r);
  destCtx.restore();
}

/**
 * Real Healing Brush implementation:
 * Copies texture from source while preserving destination's low-frequency illumination.
 */
export function applyHealingBrush(
  destCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  srcX: number,
  srcY: number,
  destX: number,
  destY: number,
  options: BrushStrokeOptions
) {
  const r = Math.max(2, Math.round(options.radius));
  const diameter = r * 2;

  // Sample source and destination patches
  const srcStartX = Math.round(srcX - r);
  const srcStartY = Math.round(srcY - r);
  const destStartX = Math.round(destX - r);
  const destStartY = Math.round(destY - r);

  const srcCtx = sourceCanvas.getContext("2d");
  if (!srcCtx) return;

  const srcImg = srcCtx.getImageData(srcStartX, srcStartY, diameter, diameter);
  const destImg = destCtx.getImageData(destStartX, destStartY, diameter, diameter);

  const sData = srcImg.data;
  const dData = destImg.data;

  // Compute average luminance of destination and source within radius
  let srcLumTotal = 0;
  let destLumTotal = 0;
  let count = 0;

  for (let py = 0; py < diameter; py++) {
    for (let px = 0; px < diameter; px++) {
      const dx = px - r;
      const dy = py - r;
      if (dx * dx + dy * dy <= r * r) {
        const idx = (py * diameter + px) * 4;
        const sLum = 0.299 * sData[idx] + 0.587 * sData[idx + 1] + 0.114 * sData[idx + 2];
        const dLum = 0.299 * dData[idx] + 0.587 * dData[idx + 1] + 0.114 * dData[idx + 2];
        srcLumTotal += sLum;
        destLumTotal += dLum;
        count++;
      }
    }
  }

  const lumDelta = count > 0 ? (destLumTotal - srcLumTotal) / count : 0;

  // Blend texture with matched luminance and feathered boundary
  for (let py = 0; py < diameter; py++) {
    for (let px = 0; px < diameter; px++) {
      const dist = Math.sqrt((px - r) * (px - r) + (py - r) * (py - r));
      if (dist <= r) {
        const idx = (py * diameter + px) * 4;

        // Feather factor based on hardness
        let falloff = 1;
        const hardDist = r * options.hardness;
        if (dist > hardDist) {
          falloff = 1 - (dist - hardDist) / (r - hardDist);
        }
        falloff *= options.opacity * options.flow;

        // Shift source RGB by luminance delta
        const healedR = Math.min(255, Math.max(0, sData[idx] + lumDelta));
        const healedG = Math.min(255, Math.max(0, sData[idx + 1] + lumDelta));
        const healedB = Math.min(255, Math.max(0, sData[idx + 2] + lumDelta));

        // Blend onto destination
        dData[idx] = Math.round(dData[idx] * (1 - falloff) + healedR * falloff);
        dData[idx + 1] = Math.round(dData[idx + 1] * (1 - falloff) + healedG * falloff);
        dData[idx + 2] = Math.round(dData[idx + 2] * (1 - falloff) + healedB * falloff);
      }
    }
  }

  destCtx.putImageData(destImg, destStartX, destStartY);
}

/**
 * Real Spot Healing implementation:
 * Fills circular blemish by seamlessly interpolating texture and color from surrounding annular ring.
 */
export function applySpotHealing(
  destCtx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  const r = Math.max(3, Math.round(radius));
  const margin = Math.ceil(r * 0.5);
  const boxR = r + margin;
  const size = boxR * 2;
  const startX = Math.round(centerX - boxR);
  const startY = Math.round(centerY - boxR);

  const imgData = destCtx.getImageData(startX, startY, size, size);
  const data = imgData.data;

  // Collect samples from surrounding annular boundary (between r and r + margin)
  const boundaryPixels: Array<{ r: number; g: number; b: number; angle: number }> = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - boxR;
      const dy = y - boxR;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= r && dist <= r + margin) {
        const idx = (y * size + x) * 4;
        const angle = Math.atan2(dy, dx);
        boundaryPixels.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          angle,
        });
      }
    }
  }

  if (boundaryPixels.length === 0) return;

  // Fill pixels inside radius by inverse-distance weighted boundary interpolation + synthetic micro-grain
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - boxR;
      const dy = y - boxR;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < r) {
        const idx = (y * size + x) * 4;
        const targetAngle = Math.atan2(dy, dx);

        // Find closest boundary samples along opposite ray directions
        let sumWeights = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (let i = 0; i < boundaryPixels.length; i += 4) {
          const bp = boundaryPixels[i];
          const angleDiff = Math.abs(bp.angle - targetAngle);
          const weight = 1 / (1 + angleDiff);

          sumR += bp.r * weight;
          sumG += bp.g * weight;
          sumB += bp.b * weight;
          sumWeights += weight;
        }

        const avgR = sumR / sumWeights;
        const avgG = sumG / sumWeights;
        const avgB = sumB / sumWeights;

        // Subtle organic noise (±2) to preserve authentic sensor grain
        const grain = (Math.random() - 0.5) * 4;

        // Feather boundary smoothly
        const blendFactor = Math.pow(1 - dist / r, 0.7);

        data[idx] = Math.min(255, Math.max(0, Math.round(data[idx] * (1 - blendFactor) + (avgR + grain) * blendFactor)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(data[idx + 1] * (1 - blendFactor) + (avgG + grain) * blendFactor)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(data[idx + 2] * (1 - blendFactor) + (avgB + grain) * blendFactor)));
      }
    }
  }

  destCtx.putImageData(imgData, startX, startY);
}

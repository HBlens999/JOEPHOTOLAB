export type SupportedColorSpace = "sRGB" | "Display-P3" | "AdobeRGB";

// Primaries and White Point D65 Matrix Transformations in Linear RGB

// sRGB to XYZ (D65)
const M_SRGB_TO_XYZ = [
  0.4124564, 0.3575761, 0.1804375,
  0.2126729, 0.7151522, 0.0721750,
  0.0193339, 0.1191920, 0.9503041,
];

// Display P3 to XYZ (D65)
const M_P3_TO_XYZ = [
  0.4865709, 0.2656677, 0.1982173,
  0.2289746, 0.6917393, 0.0792861,
  0.0000000, 0.0451134, 1.0439444,
];

// Adobe RGB to XYZ (D65)
const M_ADOBE_TO_XYZ = [
  0.5767309, 0.1855540, 0.1881852,
  0.2973769, 0.6273491, 0.0752741,
  0.0270343, 0.0706872, 0.9911085,
];

// Inverse: XYZ to sRGB
const M_XYZ_TO_SRGB = [
   3.2404542, -1.5371385, -0.4985314,
  -0.9692660,  1.8760108,  0.0415560,
   0.0556434, -0.2040259,  1.0572252,
];

// Inverse: XYZ to Display P3
const M_XYZ_TO_P3 = [
   2.4934969, -0.9313836, -0.4027108,
  -0.8294890,  1.7626641,  0.0236247,
   0.0358458, -0.0761724,  0.9568845,
];

// Inverse: XYZ to Adobe RGB
const M_XYZ_TO_ADOBE = [
   2.0413690, -0.5649464, -0.3446944,
  -0.9692660,  1.8760108,  0.0415560,
   0.0134474, -0.1183897,  1.0154096,
];

// Matrix multiplication: C = A * B
function multiply3x3(A: number[], B: number[]): number[] {
  const C = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      C[r * 3 + c] =
        A[r * 3 + 0] * B[0 * 3 + c] +
        A[r * 3 + 1] * B[1 * 3 + c] +
        A[r * 3 + 2] * B[2 * 3 + c];
    }
  }
  return C;
}

// Transform 3D vector: [r, g, b] * M
function applyMatrix(M: number[], rgb: [number, number, number]): [number, number, number] {
  return [
    M[0] * rgb[0] + M[1] * rgb[1] + M[2] * rgb[2],
    M[3] * rgb[0] + M[4] * rgb[1] + M[5] * rgb[2],
    M[6] * rgb[0] + M[7] * rgb[1] + M[8] * rgb[2],
  ];
}

// Non-linear Transfer Functions (Gamma / EOTF / OETF)

export function srgbToLinear(val: number): number {
  const v = val / 255.0;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSRGB(val: number): number {
  const v = Math.max(0, Math.min(1, val));
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

export function adobeToLinear(val: number): number {
  const v = val / 255.0;
  return Math.pow(v, 2.19921875);
}

export function linearToAdobe(val: number): number {
  const v = Math.max(0, Math.min(1, val));
  return Math.round(Math.max(0, Math.min(255, Math.pow(v, 1.0 / 2.19921875) * 255)));
}

/**
 * Computes direct 3x3 conversion matrix from source color space to destination color space in linear light.
 */
export function getGamutConversionMatrix(
  from: SupportedColorSpace,
  to: SupportedColorSpace
): number[] {
  if (from === to) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  // To XYZ
  let toXYZ: number[] = M_SRGB_TO_XYZ;
  if (from === "Display-P3") toXYZ = M_P3_TO_XYZ;
  else if (from === "AdobeRGB") toXYZ = M_ADOBE_TO_XYZ;

  // XYZ to target
  let fromXYZ: number[] = M_XYZ_TO_SRGB;
  if (to === "Display-P3") fromXYZ = M_XYZ_TO_P3;
  else if (to === "AdobeRGB") fromXYZ = M_XYZ_TO_ADOBE;

  return multiply3x3(fromXYZ, toXYZ);
}

/**
 * Accurately transforms an ImageData buffer between color spaces with gamma-aware linear processing.
 */
export function convertColorSpace(
  imageData: ImageData,
  from: SupportedColorSpace,
  to: SupportedColorSpace
): ImageData {
  if (from === to) return imageData;

  const M = getGamutConversionMatrix(from, to);
  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    // 1. EOTF: Non-linear to Linear
    let linR: number;
    let linG: number;
    let linB: number;

    if (from === "AdobeRGB") {
      linR = adobeToLinear(data[i]);
      linG = adobeToLinear(data[i + 1]);
      linB = adobeToLinear(data[i + 2]);
    } else {
      // sRGB and Display P3 use the same IEC 61966-2-1 transfer function
      linR = srgbToLinear(data[i]);
      linG = srgbToLinear(data[i + 1]);
      linB = srgbToLinear(data[i + 2]);
    }

    // 2. Linear Color Matrix Transformation
    const [tLinearR, tLinearG, tLinearB] = applyMatrix(M, [linR, linG, linB]);

    // 3. OETF: Linear to Target Non-linear
    if (to === "AdobeRGB") {
      data[i] = linearToAdobe(tLinearR);
      data[i + 1] = linearToAdobe(tLinearG);
      data[i + 2] = linearToAdobe(tLinearB);
    } else {
      data[i] = linearToSRGB(tLinearR);
      data[i + 1] = linearToSRGB(tLinearG);
      data[i + 2] = linearToSRGB(tLinearB);
    }
    // Alpha channel unchanged
  }

  return imageData;
}

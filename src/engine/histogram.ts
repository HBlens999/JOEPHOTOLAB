export interface HistogramData {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  luminance: Uint32Array;
  max: number;
}

export function computeHistogram(imageData: ImageData): HistogramData {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const luminance = new Uint32Array(256);

  const data = imageData.data;
  const len = data.length;

  // Downsample if over 1 megapixel for instantaneous 60fps responsiveness
  const step = len > 4000000 ? 16 : len > 1000000 ? 8 : 4;

  let maxVal = 0;

  for (let i = 0; i < len; i += step) {
    const a = data[i + 3];
    if (a < 10) continue; // ignore transparent pixels

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    r[red]++;
    g[green]++;
    b[blue]++;

    // Rec. 709 luminance weights
    const lum = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);
    luminance[lum]++;

    if (r[red] > maxVal) maxVal = r[red];
    if (g[green] > maxVal) maxVal = g[green];
    if (b[blue] > maxVal) maxVal = b[blue];
    if (luminance[lum] > maxVal) maxVal = luminance[lum];
  }

  return { r, g, b, luminance, max: maxVal || 1 };
}

import { Layer, PhotoDocument, AdjustmentSettings, BlendMode, getDefaultAdjustments } from "../types/document";
import { buildCurveLUT } from "./curvesSpline";

// WebGL2 Shaders for High-Performance Real-Time Compositing & Grading

const VERTEX_SHADER_SRC = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const ADJUSTMENT_FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_resolution;

// Curves LUTs
uniform sampler2D u_curveLutR;
uniform sampler2D u_curveLutG;
uniform sampler2D u_curveLutB;
uniform bool u_passthrough;

// Basic Adjustments
uniform float u_brightness;       // -1.0 to 1.0
uniform float u_contrast;         // -1.0 to 1.0
uniform float u_exposure;         // -5.0 to 5.0
uniform float u_highlights;       // -1.0 to 1.0
uniform float u_shadows;          // -1.0 to 1.0
uniform float u_temperature;      // -1.0 to 1.0
uniform float u_tint;             // -1.0 to 1.0
uniform float u_saturation;       // -1.0 to 1.0
uniform float u_vibrance;         // -1.0 to 1.0

// Levels (Per-channel: InBlack, Gamma, InWhite)
uniform vec3 u_levelsInRGB;
uniform vec3 u_levelsInR;
uniform vec3 u_levelsInG;
uniform vec3 u_levelsInB;

// HSL 8-Band Arrays (Hue delta, Sat delta, Lum delta)
// 0=Master, 1=Reds, 2=Oranges, 3=Yellows, 4=Greens, 5=Aquas, 6=Blues, 7=Purples, 8=Magentas
uniform vec3 u_hslBands[9];

// Color Balance: x=Cyan-Red, y=Magenta-Green, z=Yellow-Blue (-1.0 to 1.0)
uniform vec3 u_cbShadows;
uniform vec3 u_cbMidtones;
uniform vec3 u_cbHighlights;
uniform float u_cbPreserveLum;

// Effects: Sharpen & Blur & Vignette
uniform float u_sharpen;          // 0.0 to 1.0
uniform float u_blur;             // 0.0 to 1.0
uniform float u_vignetteAmount;   // -1.0 to 1.0
uniform float u_vignetteMidpoint; // 0.0 to 1.0
uniform float u_vignetteFeather;  // 0.0 to 1.0

// Helper: RGB to HSL
vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float d = maxC - minC;
  float l = (maxC + minC) * 0.5;
  if (d < 0.0001) return vec3(0.0, 0.0, l);

  float s = (l > 0.5) ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h = 0.0;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  if (hsl.y <= 0.0001) return vec3(hsl.z);
  float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
  float p = 2.0 * hsl.z - q;
  return vec3(
    hue2rgb(p, q, hsl.x + 1.0 / 3.0),
    hue2rgb(p, q, hsl.x),
    hue2rgb(p, q, hsl.x - 1.0 / 3.0)
  );
}

// Calculate angular difference in degrees
float hueDist(float h1, float h2) {
  float d = abs(h1 - h2);
  return min(d, 360.0 - d);
}

void main() {
  vec2 uv = v_texCoord;
  vec4 color = texture(u_image, uv);

  // The final document composite is already fully composited and must not be
  // processed by the grading shader. This direct path prevents LUT/state
  // leakage from ever changing imported images or the white artboard.
  if (u_passthrough) {
    fragColor = color;
    return;
  }

  // Apply Sharpening if enabled
  if (u_sharpen > 0.0) {
    vec2 step = 1.0 / u_resolution;
    vec4 n = texture(u_image, uv + vec2(0.0, step.y));
    vec4 s = texture(u_image, uv - vec2(0.0, step.y));
    vec4 e = texture(u_image, uv + vec2(step.x, 0.0));
    vec4 w = texture(u_image, uv - vec2(step.x, 0.0));
    vec4 edge = 4.0 * color - (n + s + e + w);
    color.rgb += edge.rgb * (u_sharpen * 1.5);
  }

  // Apply Gaussian Blur approximation if enabled
  if (u_blur > 0.0) {
    vec2 step = (u_blur * 2.0) / u_resolution;
    vec4 blurred = color * 0.36;
    blurred += (texture(u_image, uv + vec2(step.x, 0.0)) + texture(u_image, uv - vec2(step.x, 0.0))) * 0.16;
    blurred += (texture(u_image, uv + vec2(0.0, step.y)) + texture(u_image, uv - vec2(0.0, step.y))) * 0.16;
    blurred += (texture(u_image, uv + step) + texture(u_image, uv - step)) * 0.08;
    blurred += (texture(u_image, uv + vec2(step.x, -step.y)) + texture(u_image, uv + vec2(-step.x, step.y))) * 0.08;
    color = blurred;
  }

  if (color.a < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  vec3 rgb = clamp(color.rgb, 0.0, 1.0);

  // 1. Exposure (2^EV)
  rgb *= pow(2.0, u_exposure);

  // 2. Brightness & Contrast
  rgb += u_brightness * 0.5;
  rgb = (rgb - 0.5) * (1.0 + u_contrast) + 0.5;

  // 3. Highlights & Shadows
  float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (u_highlights != 0.0) {
    float hlMask = smoothstep(0.45, 1.0, lum);
    rgb += u_highlights * 0.35 * hlMask;
  }
  if (u_shadows != 0.0) {
    float shMask = 1.0 - smoothstep(0.0, 0.55, lum);
    rgb += u_shadows * 0.35 * shMask;
  }

  // 4. White Balance (Temperature & Tint)
  rgb.r += u_temperature * 0.22;
  rgb.b -= u_temperature * 0.22;
  rgb.g += u_tint * 0.16;

  // 5. Saturation & Vibrance
  lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  if (u_saturation != 0.0) {
    rgb = mix(vec3(lum), rgb, 1.0 + u_saturation);
  }
  if (u_vibrance != 0.0) {
    float maxC = max(rgb.r, max(rgb.g, rgb.b));
    float minC = min(rgb.r, min(rgb.g, rgb.b));
    float sat = (maxC - minC) / (maxC + 0.001);
    float vibFactor = (1.0 - sat) * u_vibrance;
    rgb = mix(vec3(lum), rgb, 1.0 + vibFactor);
  }

  // 6. Levels: Channel-specific and RGB Master
  rgb = clamp(rgb, 0.0, 1.0);
  // Red
  float rDiff = max(0.001, u_levelsInR.z - u_levelsInR.x);
  rgb.r = clamp((rgb.r - u_levelsInR.x) / rDiff, 0.0, 1.0);
  rgb.r = pow(rgb.r, 1.0 / u_levelsInR.y);
  // Green
  float gDiff = max(0.001, u_levelsInG.z - u_levelsInG.x);
  rgb.g = clamp((rgb.g - u_levelsInG.x) / gDiff, 0.0, 1.0);
  rgb.g = pow(rgb.g, 1.0 / u_levelsInG.y);
  // Blue
  float bDiff = max(0.001, u_levelsInB.z - u_levelsInB.x);
  rgb.b = clamp((rgb.b - u_levelsInB.x) / bDiff, 0.0, 1.0);
  rgb.b = pow(rgb.b, 1.0 / u_levelsInB.y);
  // Master RGB
  float rgbDiff = max(0.001, u_levelsInRGB.z - u_levelsInRGB.x);
  rgb = clamp((rgb - u_levelsInRGB.x) / rgbDiff, 0.0, 1.0);
  rgb = pow(rgb, vec3(1.0 / u_levelsInRGB.y));

  // 7. Curves Lookup
  rgb = clamp(rgb, 0.0, 1.0);
  rgb.r = texture(u_curveLutR, vec2(rgb.r, 0.5)).r;
  rgb.g = texture(u_curveLutG, vec2(rgb.g, 0.5)).r;
  rgb.b = texture(u_curveLutB, vec2(rgb.b, 0.5)).r;

  // 8. HSL 8-Band Color Mixer
  vec3 hsl = rgb2hsl(rgb);
  float hueDeg = hsl.x * 360.0;

  // Apply Master HSL
  hsl.x = fract(hsl.x + u_hslBands[0].x / 360.0);
  hsl.y = clamp(hsl.y + u_hslBands[0].y, 0.0, 1.0);
  hsl.z = clamp(hsl.z + u_hslBands[0].z, 0.0, 1.0);

  // Band center angles: Reds=0, Oranges=30, Yellows=60, Greens=120, Aquas=180, Blues=240, Purples=280, Magentas=320
  float bandCenters[8] = float[8](0.0, 30.0, 60.0, 120.0, 180.0, 240.0, 280.0, 320.0);
  float bandWidths[8] = float[8](35.0, 30.0, 35.0, 50.0, 45.0, 50.0, 40.0, 40.0);

  for (int i = 0; i < 8; i++) {
    vec3 bandParams = u_hslBands[i + 1];
    if (length(bandParams) > 0.0001) {
      float dist = hueDist(hueDeg, bandCenters[i]);
      if (dist < bandWidths[i]) {
        float weight = 0.5 + 0.5 * cos(3.14159 * dist / bandWidths[i]);
        weight *= smoothstep(0.05, 0.25, hsl.y); // only affect chromatic pixels
        hsl.x = fract(hsl.x + (bandParams.x / 360.0) * weight);
        hsl.y = clamp(hsl.y + bandParams.y * weight, 0.0, 1.0);
        hsl.z = clamp(hsl.z + bandParams.z * weight, 0.0, 1.0);
      }
    }
  }
  rgb = hsl2rgb(hsl);

  // 9. Color Balance (Shadows, Midtones, Highlights)
  float origLum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float wShadow = clamp((0.35 - origLum) / 0.35, 0.0, 1.0);
  float wHighlight = clamp((origLum - 0.65) / 0.35, 0.0, 1.0);
  float wMidtone = 1.0 - wShadow - wHighlight;

  vec3 cbShift = u_cbShadows * wShadow + u_cbMidtones * wMidtone + u_cbHighlights * wHighlight;
  rgb += cbShift * 0.4;
  if (u_cbPreserveLum > 0.5) {
    float newLum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    if (newLum > 0.0001) {
      rgb *= (origLum / newLum);
    }
  }

  // 10. Vignette
  if (u_vignetteAmount != 0.0) {
    vec2 coord = (uv - 0.5) * 2.0;
    float dist = length(coord);
    float inner = u_vignetteMidpoint * 0.8;
    float outer = inner + max(0.1, u_vignetteFeather * 0.8);
    float vignetteFactor = smoothstep(inner, outer, dist);
    rgb = mix(rgb, rgb * (1.0 - u_vignetteAmount * 0.8), vignetteFactor);
  }

  fragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`;

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quadVAO: WebGLVertexArrayObject | null = null;

  private textureMap = new Map<string, WebGLTexture>();
  private lutTextureR: WebGLTexture | null = null;
  private lutTextureG: WebGLTexture | null = null;
  private lutTextureB: WebGLTexture | null = null;

  // Offscreen FBO for processing layers through GPU shader
  private fbo: WebGLFramebuffer | null = null;
  private fboTexture: WebGLTexture | null = null;
  private fboWidth: number = 0;
  private fboHeight: number = 0;

  constructor(targetCanvas: HTMLCanvasElement) {
    this.canvas = targetCanvas;
    this.initGL();
    this.setupContextLossHandling();
  }

  private setupContextLossHandling() {
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL2 context lost. Awaiting restoration...");
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      console.log("WebGL2 context restored. Rebuilding GPU pipelines...");
      this.initGL();
    });
  }

  private initGL() {
    this.gl = this.canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      console.warn("WebGL2 not available, falling back to 2D Canvas");
      return;
    }

    const gl = this.gl;

    // Create shaders
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, ADJUSTMENT_FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    this.program = gl.createProgram();
    if (!this.program) return;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("Shader program link failed:", gl.getProgramInfoLog(this.program));
      return;
    }

    // Fullscreen Quad VAO
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    const quadVertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, "a_position");
    const aTex = gl.getAttribLocation(this.program, "a_texCoord");

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);

    // Create LUT textures for curves
    this.lutTextureR = this.create1DLUTTexture();
    this.lutTextureG = this.create1DLUTTexture();
    this.lutTextureB = this.create1DLUTTexture();

    // Create FBO
    this.fbo = gl.createFramebuffer();
  }

  private compileShader(type: number, src: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private create1DLUTTexture(): WebGLTexture | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const initData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) initData[i] = i;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, initData);
    return tex;
  }

  private updateLUT(tex: WebGLTexture | null, lut: Uint8Array) {
    if (!this.gl || !tex) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RED, gl.UNSIGNED_BYTE, lut);
  }

  private uploadLayerTexture(layerId: string, canvas: HTMLCanvasElement): WebGLTexture | null {
    if (!this.gl) return null;
    const gl = this.gl;
    let tex = this.textureMap.get(layerId);
    if (!tex) {
      tex = gl.createTexture()!;
      this.textureMap.set(layerId, tex);
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    return tex;
  }

  /**
   * Primary composite entry point: Composites all visible document layers with
   * non-destructive adjustments, dedicated adjustment layers, blend modes, masks, and AI blend strength.
   */
  public renderDocument(doc: PhotoDocument, offscreenCompositeCanvas: HTMLCanvasElement) {
    if (!this.gl || !this.program || !this.quadVAO) {
      this.renderCanvas2DFallback(doc, offscreenCompositeCanvas);
      return;
    }

    const gl = this.gl;
    const width = doc.width;
    const height = doc.height;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (offscreenCompositeCanvas.width !== width || offscreenCompositeCanvas.height !== height) {
      offscreenCompositeCanvas.width = width;
      offscreenCompositeCanvas.height = height;
    }

    const offCtx = offscreenCompositeCanvas.getContext("2d");
    if (!offCtx) return;

    // Clear composite canvas
    offCtx.clearRect(0, 0, width, height);
    if (doc.backgroundColor && doc.backgroundColor !== "transparent") {
      offCtx.fillStyle = doc.backgroundColor;
      offCtx.fillRect(0, 0, width, height);
    }

    // Process layer stack in reverse (bottom to top)
    const reversedLayers = [...doc.layers].reverse();

    for (const layer of reversedLayers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      if (layer.type === "raster" || layer.type === "ai") {
        if (!layer.canvas) continue;

        // Apply layer-specific adjustments via GPU FBO shader
        const layerCanvasToDraw = this.renderAdjustedLayer(layer);

        offCtx.save();
        offCtx.globalAlpha = layer.opacity;
        offCtx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);

        const lx = layer.x || 0;
        const ly = layer.y || 0;
        const lw = layer.width || layer.canvas.width;
        const lh = layer.height || layer.canvas.height;

        if (layer.rotation) {
          const cx = lx + lw / 2;
          const cy = ly + lh / 2;
          offCtx.translate(cx, cy);
          offCtx.rotate((layer.rotation * Math.PI) / 180);
          offCtx.translate(-cx, -cy);
        }

        offCtx.drawImage(layerCanvasToDraw, lx, ly, lw, lh);

        if (layer.mask && layer.mask.enabled && layer.mask.canvas) {
          offCtx.globalCompositeOperation = "destination-in";
          offCtx.drawImage(layer.mask.canvas, lx, ly, lw, lh);
        }

        offCtx.restore();
      } else if (layer.type === "shape" && layer.shapeProps) {
        const props = layer.shapeProps;
        offCtx.save();
        offCtx.globalAlpha = layer.opacity;
        offCtx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        offCtx.rotate((layer.rotation * Math.PI) / 180);
        offCtx.translate(-layer.width / 2, -layer.height / 2);

        const fillAlpha = Math.max(0, Math.min(1, props.fillOpacity));
        const strokeAlpha = Math.max(0, Math.min(1, props.strokeOpacity));
        if (props.kind === "ellipse") {
          offCtx.beginPath();
          offCtx.ellipse(layer.width / 2, layer.height / 2, Math.abs(layer.width / 2), Math.abs(layer.height / 2), 0, 0, Math.PI * 2);
        } else {
          const r = Math.min(Math.max(0, props.cornerRadius), Math.min(layer.width, layer.height) / 2);
          if (r > 0) {
            offCtx.beginPath();
            offCtx.roundRect(0, 0, layer.width, layer.height, r);
          } else {
            offCtx.beginPath();
            offCtx.rect(0, 0, layer.width, layer.height);
          }
        }
        if (fillAlpha > 0) {
          offCtx.fillStyle = props.fill || "#ffffff";
          offCtx.globalAlpha = layer.opacity * fillAlpha;
          offCtx.fill();
        }
        if (props.strokeWidth > 0 && strokeAlpha > 0) {
          offCtx.strokeStyle = props.stroke || "#000000";
          offCtx.lineWidth = props.strokeWidth;
          offCtx.globalAlpha = layer.opacity * strokeAlpha;
          offCtx.stroke();
        }
        offCtx.restore();
      } else if (layer.type === "shape" && layer.shapeProps) {
        const props = layer.shapeProps;
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-layer.width / 2, -layer.height / 2);
        ctx.beginPath();
        if (props.kind === "ellipse") {
          ctx.ellipse(layer.width / 2, layer.height / 2, Math.abs(layer.width / 2), Math.abs(layer.height / 2), 0, 0, Math.PI * 2);
        } else if (props.cornerRadius > 0) {
          ctx.roundRect(0, 0, layer.width, layer.height, Math.min(props.cornerRadius, Math.min(layer.width, layer.height) / 2));
        } else {
          ctx.rect(0, 0, layer.width, layer.height);
        }
        ctx.globalAlpha = layer.opacity * Math.max(0, Math.min(1, props.fillOpacity));
        ctx.fillStyle = props.fill;
        if (props.fillOpacity > 0) ctx.fill();
        ctx.globalAlpha = layer.opacity * Math.max(0, Math.min(1, props.strokeOpacity));
        ctx.strokeStyle = props.stroke;
        ctx.lineWidth = props.strokeWidth;
        if (props.strokeWidth > 0 && props.strokeOpacity > 0) ctx.stroke();
        ctx.restore();
      } else if (layer.type === "text" && layer.textProps) {
        offCtx.save();
        offCtx.globalAlpha = layer.opacity;
        offCtx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);

        const props = layer.textProps;
        offCtx.font = `${props.fontStyle} ${props.fontWeight} ${props.fontSize}px "${props.fontFamily}", sans-serif`;
        offCtx.fillStyle = props.fill || "#FFFFFF";
        offCtx.textAlign = props.align || "left";
        offCtx.textBaseline = "top";

        offCtx.fillText(props.text, layer.x, layer.y);
        offCtx.restore();
      } else if (layer.type === "adjustment" && layer.adjustments) {
        // Dedicated Adjustment Layer: modifies the composite of all layers below it!
        this.applyAdjustmentLayerToComposite(layer, offscreenCompositeCanvas);
      }
    }

    // Upload composite to viewport canvas
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const compTexture = this.uploadLayerTexture("__final_composite__", offscreenCompositeCanvas);
    if (!compTexture) return;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, compTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_image"), 0);
    gl.uniform2f(gl.getUniformLocation(this.program, "u_resolution"), width, height);

    this.setUniformsIdentity();

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  /**
   * Applies GPU shader adjustments to an individual layer canvas using FBO
   */
  public renderAdjustedLayer(layer: Layer): HTMLCanvasElement {
    if (!layer.canvas) return document.createElement("canvas");
    const adj = layer.adjustments;
    if (!adj && !layer.aiMetadata) {
      return layer.canvas;
    }

    const gl = this.gl;
    if (!gl || !this.program || !this.quadVAO) {
      return this.applyAdjustmentsCanvas2D(layer.canvas, adj);
    }

    const w = layer.canvas.width;
    const h = layer.canvas.height;

    // Ensure FBO texture matches dimensions
    if (!this.fboTexture || this.fboWidth !== w || this.fboHeight !== h) {
      this.fboTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.fboTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTexture, 0);
      this.fboWidth = w;
      this.fboHeight = h;
    }

    const inputTex = this.uploadLayerTexture(`layer_${layer.id}`, layer.canvas);
    if (!inputTex) return layer.canvas;

    // Bind FBO and viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVAO);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_image"), 0);
    gl.uniform2f(gl.getUniformLocation(this.program, "u_resolution"), w, h);

    // Set adjustments uniforms
    if (adj) {
      this.setUniformsFromAdjustments(adj);
    } else {
      this.setUniformsIdentity();
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Read pixels back to a canvas
    const scratch = document.createElement("canvas");
    scratch.width = w;
    scratch.height = h;
    const sCtx = scratch.getContext("2d");
    if (!sCtx) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return layer.canvas;
    }

    const imgData = sCtx.createImageData(w, h);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);

    // Flip Y because WebGL reads from bottom-left
    const flippedData = sCtx.createImageData(w, h);
    const rowBytes = w * 4;
    for (let y = 0; y < h; y++) {
      const srcRow = (h - 1 - y) * rowBytes;
      const dstRow = y * rowBytes;
      flippedData.data.set(imgData.data.subarray(srcRow, srcRow + rowBytes), dstRow);
    }
    sCtx.putImageData(flippedData, 0, 0);

    // AI Blend Strength if configured
    if (layer.aiMetadata && typeof layer.aiMetadata.aiBlendStrength === "number") {
      sCtx.globalCompositeOperation = "destination-in";
      sCtx.fillStyle = `rgba(0, 0, 0, ${layer.aiMetadata.aiBlendStrength / 100})`;
      sCtx.fillRect(0, 0, w, h);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    return scratch;
  }

  /**
   * Applies an adjustment layer directly to the current composite canvas
   */
  private applyAdjustmentLayerToComposite(layer: Layer, compositeCanvas: HTMLCanvasElement) {
    if (!layer.adjustments) return;
    const adjusted = this.renderAdjustedLayer({
      ...layer,
      canvas: compositeCanvas,
    });

    const ctx = compositeCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);
    ctx.drawImage(adjusted, 0, 0);

    if (layer.mask && layer.mask.enabled && layer.mask.canvas) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(layer.mask.canvas, 0, 0);
    }
    ctx.restore();
  }

  private setUniformsFromAdjustments(adj: AdjustmentSettings) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    gl.uniform1f(gl.getUniformLocation(this.program, "u_brightness"), adj.brightness / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_contrast"), adj.contrast / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_exposure"), adj.exposure);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_highlights"), adj.highlights / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_shadows"), adj.shadows / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_temperature"), adj.temperature / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_tint"), adj.tint / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_saturation"), adj.saturation / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vibrance"), adj.vibrance / 100.0);

    // Levels
    const rgbLvl = adj.levels.rgb;
    const rLvl = adj.levels.red;
    const gLvl = adj.levels.green;
    const bLvl = adj.levels.blue;

    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInRGB"), rgbLvl.black / 255.0, rgbLvl.gamma, rgbLvl.white / 255.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInR"), rLvl.black / 255.0, rLvl.gamma, rLvl.white / 255.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInG"), gLvl.black / 255.0, gLvl.gamma, gLvl.white / 255.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInB"), bLvl.black / 255.0, bLvl.gamma, bLvl.white / 255.0);

    // Curves LUTs
    const lutR = buildCurveLUT(adj.curves.red.length > 0 ? adj.curves.red : adj.curves.rgb);
    const lutG = buildCurveLUT(adj.curves.green.length > 0 ? adj.curves.green : adj.curves.rgb);
    const lutB = buildCurveLUT(adj.curves.blue.length > 0 ? adj.curves.blue : adj.curves.rgb);

    this.updateLUT(this.lutTextureR, lutR);
    this.updateLUT(this.lutTextureG, lutG);
    this.updateLUT(this.lutTextureB, lutB);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureR);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutR"), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureG);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutG"), 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureB);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutB"), 3);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_passthrough"), 0);

    // HSL Bands (9 vec3: Master + 8 bands)
    const hslBandsData = new Float32Array(27);
    const bandKeys = ["master", "reds", "oranges", "yellows", "greens", "aquas", "blues", "purples", "magentas"] as const;
    for (let i = 0; i < 9; i++) {
      const channel = adj.hsl[bandKeys[i]];
      hslBandsData[i * 3] = channel.hue;
      hslBandsData[i * 3 + 1] = channel.sat / 100.0;
      hslBandsData[i * 3 + 2] = channel.lum / 100.0;
    }
    gl.uniform3fv(gl.getUniformLocation(this.program, "u_hslBands"), hslBandsData);

    // Color Balance
    const cb = adj.colorBalance;
    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbShadows"), cb.shadows.cyanRed / 100.0, cb.shadows.magentaGreen / 100.0, cb.shadows.yellowBlue / 100.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbMidtones"), cb.midtones.cyanRed / 100.0, cb.midtones.magentaGreen / 100.0, cb.midtones.yellowBlue / 100.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbHighlights"), cb.highlights.cyanRed / 100.0, cb.highlights.magentaGreen / 100.0, cb.highlights.yellowBlue / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_cbPreserveLum"), cb.preserveLuminosity ? 1.0 : 0.0);

    // Effects
    gl.uniform1f(gl.getUniformLocation(this.program, "u_sharpen"), adj.sharpness / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_blur"), adj.blur / 10.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteAmount"), adj.vignette.amount / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteMidpoint"), adj.vignette.midpoint / 100.0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteFeather"), adj.vignette.feather / 100.0);
  }

  private setUniformsIdentity() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    gl.uniform1i(gl.getUniformLocation(this.program, "u_passthrough"), 1);

    // The fragment shader always evaluates the three curve LUT samplers.
    // Explicitly bind the identity LUTs here; otherwise the samplers retain
    // their default texture-unit state and can accidentally sample u_image,
    // producing the red/black composite seen in the editor.
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureR);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutR"), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureG);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutG"), 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextureB);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_curveLutB"), 3);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_brightness"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_contrast"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_exposure"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_highlights"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_shadows"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_temperature"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_tint"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_saturation"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vibrance"), 0);

    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInRGB"), 0, 1.0, 1.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInR"), 0, 1.0, 1.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInG"), 0, 1.0, 1.0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_levelsInB"), 0, 1.0, 1.0);

    const identityHsl = new Float32Array(27);
    gl.uniform3fv(gl.getUniformLocation(this.program, "u_hslBands"), identityHsl);

    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbShadows"), 0, 0, 0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbMidtones"), 0, 0, 0);
    gl.uniform3f(gl.getUniformLocation(this.program, "u_cbHighlights"), 0, 0, 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_cbPreserveLum"), 1.0);

    gl.uniform1f(gl.getUniformLocation(this.program, "u_sharpen"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_blur"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteAmount"), 0);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteMidpoint"), 0.5);
    gl.uniform1f(gl.getUniformLocation(this.program, "u_vignetteFeather"), 0.5);
  }

  private mapBlendMode(mode: BlendMode): GlobalCompositeOperation {
    switch (mode) {
      case "multiply": return "multiply";
      case "screen": return "screen";
      case "overlay": return "overlay";
      case "darken": return "darken";
      case "lighten": return "lighten";
      case "color-dodge": return "color-dodge";
      case "color-burn": return "color-burn";
      case "soft-light": return "soft-light";
      default: return "source-over";
    }
  }

  /**
   * Pure Canvas 2D fallback compositing pipeline
   */
  public renderCanvas2DFallback(doc: PhotoDocument, targetCanvas: HTMLCanvasElement) {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, doc.width, doc.height);

    if (doc.backgroundColor && doc.backgroundColor !== "transparent") {
      ctx.fillStyle = doc.backgroundColor;
      ctx.fillRect(0, 0, doc.width, doc.height);
    }

    const reversedLayers = [...doc.layers].reverse();

    for (const layer of reversedLayers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);

      if ((layer.type === "raster" || layer.type === "ai") && layer.canvas) {
        const adjustedCanvas = this.applyAdjustmentsCanvas2D(layer.canvas, layer.adjustments);
        ctx.drawImage(adjustedCanvas, layer.x, layer.y, layer.width, layer.height);
      } else if (layer.type === "text" && layer.textProps) {
        const props = layer.textProps;
        ctx.font = `${props.fontStyle} ${props.fontWeight} ${props.fontSize}px "${props.fontFamily}", sans-serif`;
        ctx.fillStyle = props.fill || "#FFFFFF";
        ctx.textAlign = props.align || "left";
        ctx.textBaseline = "top";
        ctx.fillText(props.text, layer.x, layer.y);
      } else if (layer.type === "adjustment" && layer.adjustments) {
        // Apply adjustment layer to current composite in 2D
        const adjusted = this.applyAdjustmentsCanvas2D(targetCanvas, layer.adjustments);
        ctx.drawImage(adjusted, 0, 0);
      }

      ctx.restore();
    }
  }

  /**
   * Software pixel pipeline fallback for adjustments
   */
  private applyAdjustmentsCanvas2D(canvas: HTMLCanvasElement, adj?: AdjustmentSettings): HTMLCanvasElement {
    if (!adj) return canvas;
    const scratch = document.createElement("canvas");
    scratch.width = canvas.width;
    scratch.height = canvas.height;
    const sCtx = scratch.getContext("2d");
    if (!sCtx) return canvas;

    sCtx.drawImage(canvas, 0, 0);
    const imgData = sCtx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const expMult = Math.pow(2.0, adj.exposure);
    const brightAdd = adj.brightness * 1.28;
    const contMult = (adj.contrast + 100) / 100;
    const satMult = 1.0 + adj.saturation / 100.0;
    const tempShift = (adj.temperature / 100.0) * 45;
    const tintShift = (adj.tint / 100.0) * 35;
    const hlFactor = adj.highlights / 100.0;
    const shFactor = adj.shadows / 100.0;

    // Precompute Curves LUTs
    const lutR = buildCurveLUT(adj.curves.red.length > 0 ? adj.curves.red : adj.curves.rgb);
    const lutG = buildCurveLUT(adj.curves.green.length > 0 ? adj.curves.green : adj.curves.rgb);
    const lutB = buildCurveLUT(adj.curves.blue.length > 0 ? adj.curves.blue : adj.curves.rgb);

    // Levels parameters
    const rInB = adj.levels.red.black;
    const rInW = adj.levels.red.white;
    const rGam = adj.levels.red.gamma;
    const gInB = adj.levels.green.black;
    const gInW = adj.levels.green.white;
    const gGam = adj.levels.green.gamma;
    const bInB = adj.levels.blue.black;
    const bInW = adj.levels.blue.white;
    const bGam = adj.levels.blue.gamma;

    const rgbInB = adj.levels.rgb.black;
    const rgbInW = adj.levels.rgb.white;
    const rgbGam = adj.levels.rgb.gamma;

    // Color Balance
    const cb = adj.colorBalance;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // 1. Exposure
      r *= expMult;
      g *= expMult;
      b *= expMult;

      // 2. Brightness & Contrast
      r += brightAdd;
      g += brightAdd;
      b += brightAdd;

      r = (r - 128) * contMult + 128;
      g = (g - 128) * contMult + 128;
      b = (b - 128) * contMult + 128;

      // 3. Highlights & Shadows
      let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (hlFactor !== 0 && lum > 120) {
        const mask = (lum - 120) / 135;
        r += hlFactor * 40 * mask;
        g += hlFactor * 40 * mask;
        b += hlFactor * 40 * mask;
      }
      if (shFactor !== 0 && lum < 140) {
        const mask = (140 - lum) / 140;
        r += shFactor * 40 * mask;
        g += shFactor * 40 * mask;
        b += shFactor * 40 * mask;
      }

      // 4. White Balance (Temp & Tint)
      r += tempShift;
      b -= tempShift;
      g += tintShift;

      // 5. Saturation
      lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * satMult;
      g = lum + (g - lum) * satMult;
      b = lum + (b - lum) * satMult;

      // Clamp before non-linear mappings
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      // 6. Levels: Channel & Master
      if (rInB > 0 || rInW < 255 || rGam !== 1) {
        r = Math.min(255, Math.max(0, Math.pow(Math.max(0, r - rInB) / Math.max(1, rInW - rInB), 1 / rGam) * 255));
      }
      if (gInB > 0 || gInW < 255 || gGam !== 1) {
        g = Math.min(255, Math.max(0, Math.pow(Math.max(0, g - gInB) / Math.max(1, gInW - gInB), 1 / gGam) * 255));
      }
      if (bInB > 0 || bInW < 255 || bGam !== 1) {
        b = Math.min(255, Math.max(0, Math.pow(Math.max(0, b - bInB) / Math.max(1, bInW - bInB), 1 / bGam) * 255));
      }
      if (rgbInB > 0 || rgbInW < 255 || rgbGam !== 1) {
        r = Math.min(255, Math.max(0, Math.pow(Math.max(0, r - rgbInB) / Math.max(1, rgbInW - rgbInB), 1 / rgbGam) * 255));
        g = Math.min(255, Math.max(0, Math.pow(Math.max(0, g - rgbInB) / Math.max(1, rgbInW - rgbInB), 1 / rgbGam) * 255));
        b = Math.min(255, Math.max(0, Math.pow(Math.max(0, b - rgbInB) / Math.max(1, rgbInW - rgbInB), 1 / rgbGam) * 255));
      }

      // 7. Curves lookup
      r = lutR[Math.round(r)];
      g = lutG[Math.round(g)];
      b = lutB[Math.round(b)];

      // 8. Color Balance
      const origL = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const normL = origL / 255.0;
      const wSh = Math.max(0, Math.min(1, (0.35 - normL) / 0.35));
      const wHi = Math.max(0, Math.min(1, (normL - 0.65) / 0.35));
      const wMid = Math.max(0, 1.0 - wSh - wHi);

      r += (cb.shadows.cyanRed * wSh + cb.midtones.cyanRed * wMid + cb.highlights.cyanRed * wHi) * 0.4;
      g += (cb.shadows.magentaGreen * wSh + cb.midtones.magentaGreen * wMid + cb.highlights.magentaGreen * wHi) * 0.4;
      b += (cb.shadows.yellowBlue * wSh + cb.midtones.yellowBlue * wMid + cb.highlights.yellowBlue * wHi) * 0.4;

      if (cb.preserveLuminosity) {
        const newL = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (newL > 0.01) {
          const lumScale = origL / newL;
          r *= lumScale;
          g *= lumScale;
          b *= lumScale;
        }
      }

      d[i] = Math.min(255, Math.max(0, Math.round(r)));
      d[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
      d[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }

    sCtx.putImageData(imgData, 0, 0);
    return scratch;
  }

  public destroy() {
    if (!this.gl) return;
    for (const tex of this.textureMap.values()) {
      this.gl.deleteTexture(tex);
    }
    this.textureMap.clear();
    if (this.fboTexture) this.gl.deleteTexture(this.fboTexture);
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo);
    if (this.lutTextureR) this.gl.deleteTexture(this.lutTextureR);
    if (this.lutTextureG) this.gl.deleteTexture(this.lutTextureG);
    if (this.lutTextureB) this.gl.deleteTexture(this.lutTextureB);
    if (this.program) this.gl.deleteProgram(this.program);
    if (this.quadVAO) this.gl.deleteVertexArray(this.quadVAO);
  }
}

import { getGeminiClient } from "./jobManager.js";

export interface TextureSynthesisParams {
  imageBase64: string;
  mimeType: string;
  textureType: "Skin Pores" | "Fabric Weave" | "Hair / Beard Detail" | "Metallic Gloss" | "Natural Vegetation" | "Custom";
  detailFidelity: number; // 0 - 100
  denoiseThreshold: number; // 0 - 100
  customPrompt?: string;
}

export interface RelightingParams {
  imageBase64: string;
  mimeType: string;
  lightDirectionAngle: number; // 0 - 360 degrees
  highlightIntensity: number; // 0 - 100
  lightSoftness: number; // 0 - 100
  colorTemperature: number; // -100 to 100 (cool to warm)
  rimLightStrength: number; // 0 - 100
  catchlightEnhancer: boolean;
  shadowPreservation: number; // 0 - 100
}

export interface DetailPaintParams {
  imageBase64: string;
  mimeType: string;
  maskBase64: string;
  promptDescription?: string;
  materialTarget?: string;
}

export interface SmartSelectionParams {
  imageBase64: string;
  mimeType: string;
  target: "subject" | "background" | "sky" | "people" | "hair" | "objects";
}

export interface AIProvider {
  synthesizeMicroTexture(params: TextureSynthesisParams): Promise<{ imageBase64: string; mimeType: string }>;
  applyRelighting(params: RelightingParams): Promise<{ imageBase64: string; mimeType: string }>;
  applyDetailPaint(params: DetailPaintParams): Promise<{ imageBase64: string; mimeType: string }>;
  generateSmartSelection(params: SmartSelectionParams): Promise<{ maskBase64: string }>;
}

export class GeminiProvider implements AIProvider {
  private defaultImageModel = "gemini-3.1-flash-lite-image";
  private reasoningModel = "gemini-3.8-flash";

  async synthesizeMicroTexture(params: TextureSynthesisParams): Promise<{ imageBase64: string; mimeType: string }> {
    const ai = getGeminiClient();

    let specificTextureDirective = "";
    switch (params.textureType) {
      case "Skin Pores":
        specificTextureDirective = "Synthesize ultra-fine photorealistic dermatological skin pores, natural epidermal micro-grooves, delicate skin grain, and subtle subsurface scattering.";
        break;
      case "Fabric Weave":
        specificTextureDirective = "Synthesize microscopic thread interlacing, fine textile twill weave, subtle cotton or wool fiber micro-fuzz, and authentic tactile cloth folds.";
        break;
      case "Hair / Beard Detail":
        specificTextureDirective = "Synthesize individual crisp keratin hair strands, razor-sharp beard stubble, realistic follicle sheen, and nuanced specular highlights along hair fibers.";
        break;
      case "Metallic Gloss":
        specificTextureDirective = "Synthesize physical specular highlights, brushed micro-machined metal grooves, anisotropic reflections, and crisp clean metallic bevels.";
      case "Natural Vegetation":
        specificTextureDirective = "Synthesize botanical leaf vein networks, cellular leaf chlorophyll texture, organic bark ridges, and micro-dew drops.";
        break;
      case "Custom":
        specificTextureDirective = params.customPrompt || "Synthesize hyper-realistic micro-textures.";
        break;
    }

    const prompt = `Upscale and enhance this image to hyper-realistic high resolution with detail fidelity ${params.detailFidelity}% and denoise threshold ${params.denoiseThreshold}%. ${specificTextureDirective} Preserve exact facial structure, identity, geometry, composition, perspective, and original subject characteristics without altering proportions.`;

    // Clean base64 string
    const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: this.defaultImageModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: params.mimeType || "image/png",
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      throw new Error("No image output received from Gemini API");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    throw new Error("Gemini returned text without image data for micro-texture synthesis");
  }

  async applyRelighting(params: RelightingParams): Promise<{ imageBase64: string; mimeType: string }> {
    const ai = getGeminiClient();
    const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const rad = (params.lightDirectionAngle * Math.PI) / 180;
    const directionDesc = params.lightDirectionAngle >= 45 && params.lightDirectionAngle < 135
      ? "from top-right"
      : params.lightDirectionAngle >= 135 && params.lightDirectionAngle < 225
      ? "from bottom-right"
      : params.lightDirectionAngle >= 225 && params.lightDirectionAngle < 315
      ? "from bottom-left"
      : "from top-left";

    const tempDesc = params.colorTemperature > 10 ? "warm golden studio key light (3200K-4500K)" : params.colorTemperature < -10 ? "cool daylight studio key light (5600K-6500K)" : "neutral balanced white studio light (5000K)";

    const prompt = `Perform professional photographic studio relighting on this image. Position key light illumination striking ${directionDesc} (angle ${params.lightDirectionAngle}°). Key light color: ${tempDesc}. Highlight intensity: ${params.highlightIntensity}%. Light softness: ${params.lightSoftness}%. Rim light accent: strength ${params.rimLightStrength}% tracing subject contours. ${params.catchlightEnhancer ? "Add subtle natural eye catchlights reflecting the key source." : ""} Preserve ${params.shadowPreservation}% natural ambient shadow density. Retain exact subject identity, face structure, facial geometry, pose, clothes, and original image composition.`;

    const response = await ai.models.generateContent({
      model: this.defaultImageModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: params.mimeType || "image/png",
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      throw new Error("No image output received from Gemini API");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    throw new Error("Gemini returned text without image data for relighting");
  }

  async applyDetailPaint(params: DetailPaintParams): Promise<{ imageBase64: string; mimeType: string }> {
    const ai = getGeminiClient();
    const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const cleanMaskBase64 = params.maskBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Enhance only the masked region of this photo with photorealistic high-frequency details. Target material: ${params.materialTarget || "natural high-resolution surface"}. ${params.promptDescription || "Enhance micro-texture, sharpness, and clarity in the painted stroke area."} Do not modify any pixels outside the painted area. Preserve subject identity, geometry, composition, lighting, color relationships, and original structure. Output the composite result.`;

    const response = await ai.models.generateContent({
      model: this.defaultImageModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: params.mimeType || "image/png",
            },
          },
          {
            inlineData: {
              data: cleanMaskBase64,
              mimeType: "image/png",
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      throw new Error("No image output received from Gemini API");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    throw new Error("Gemini returned text without image data for detail paint");
  }

  async generateSmartSelection(params: SmartSelectionParams): Promise<{ maskBase64: string }> {
    const ai = getGeminiClient();
    const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // We ask Gemini to generate an exact segmentation mask for the target
    const prompt = `Analyze this image and generate an exact black-and-white segmentation mask for: "${params.target.toUpperCase()}". The output image must be a high-contrast binary mask where the ${params.target} is pure white (#FFFFFF) and everything else is pure black (#000000). The mask edges should be crisp and tightly follow the contours of the ${params.target}.`;

    try {
      const response = await ai.models.generateContent({
        model: this.defaultImageModel,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: params.mimeType || "image/png",
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return {
              maskBase64: part.inlineData.data,
            };
          }
        }
      }
    } catch {
      // Fallback: will return empty or throw to trigger client-side saliency/edge fallback
    }

    throw new Error("Smart selection mask generation failed via Gemini image model");
  }
}

export const geminiProvider = new GeminiProvider();

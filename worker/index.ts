import { DurableObject } from "cloudflare:workers";

interface Env {
  ASSETS: Fetcher;
  AI_JOBS: DurableObjectNamespace<AIJob>;
  GEMINI_API_KEY: string;
}

type JobType = "texture" | "relighting" | "detail-paint" | "smart-selection";
type JobStatus = "queued" | "processing" | "completed" | "failed";

interface JobRecord {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  resultImageData?: string;
  resultMaskData?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface AIRequest {
  imageBase64: string;
  mimeType?: string;
  maskBase64?: string;
  textureType?: string;
  detailFidelity?: number;
  denoiseThreshold?: number;
  customPrompt?: string;
  lightDirectionAngle?: number;
  highlightIntensity?: number;
  lightSoftness?: number;
  colorTemperature?: number;
  rimLightStrength?: number;
  catchlightEnhancer?: boolean;
  shadowPreservation?: number;
  promptDescription?: string;
  materialTarget?: string;
  target?: string;
  sourceLayerId?: string;
}

const GEMINI_MODEL = "gemini-3.1-flash-lite-image";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanBase64(value: string): string {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function textureDirective(textureType: string, customPrompt?: string): string {
  switch (textureType) {
    case "Skin Pores":
      return "Synthesize ultra-fine photorealistic skin pores, natural epidermal micro-grooves, delicate skin grain, and subtle subsurface scattering.";
    case "Fabric Weave":
      return "Synthesize microscopic thread interlacing, fine textile weave, subtle fiber micro-fuzz, and authentic tactile cloth folds.";
    case "Hair / Beard Detail":
      return "Synthesize individual crisp hair strands, realistic beard stubble, follicle sheen, and nuanced specular highlights along hair fibers.";
    case "Metallic Gloss":
      return "Synthesize physical specular highlights, brushed micro-machined metal grooves, anisotropic reflections, and crisp metallic bevels.";
    case "Natural Vegetation":
      return "Synthesize botanical leaf vein networks, organic bark ridges, and realistic micro-surface vegetation detail.";
    case "Custom":
      return customPrompt || "Synthesize hyper-realistic micro-textures.";
    default:
      return "Synthesize hyper-realistic micro-textures.";
  }
}

function relightDirection(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  if (a >= 45 && a < 135) return "from top-right";
  if (a >= 135 && a < 225) return "from bottom-right";
  if (a >= 225 && a < 315) return "from bottom-left";
  return "from top-left";
}

function temperatureDescription(value: number): string {
  if (value > 10) return "warm golden studio key light (3200K-4500K)";
  if (value < -10) return "cool daylight studio key light (5600K-6500K)";
  return "neutral balanced white studio light (5000K)";
}

async function callGemini(env: Env, parts: Array<Record<string, unknown>>): Promise<{ imageBase64: string; mimeType: string }> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    }
  );

  const payload = await response.json() as any;
  if (!response.ok) {
    const message = payload?.error?.message || "Gemini API request failed.";
    throw new Error(message);
  }

  const outputParts = payload?.candidates?.[0]?.content?.parts || [];
  for (const part of outputParts) {
    if (part?.inlineData?.data) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("Gemini returned no image data.");
}

async function processAI(env: Env, type: JobType, input: AIRequest): Promise<{ imageBase64?: string; mimeType?: string; maskBase64?: string }> {
  const image = {
    inline_data: {
      mime_type: input.mimeType || "image/png",
      data: cleanBase64(input.imageBase64),
    },
  };

  if (type === "texture") {
    const fidelity = Number(input.detailFidelity ?? 75);
    const denoise = Number(input.denoiseThreshold ?? 20);
    const prompt =
      `Enhance this photo with photorealistic high-frequency detail. Detail fidelity: ${fidelity}%. Denoise threshold: ${denoise}%. ${textureDirective(input.textureType || "Skin Pores", input.customPrompt)} Preserve exact facial structure, identity, geometry, composition, perspective, and original subject characteristics without altering proportions.`;
    const result = await callGemini(env, [image, { text: prompt }]);
    return { imageBase64: result.imageBase64, mimeType: result.mimeType };
  }

  if (type === "relighting") {
    const angle = Number(input.lightDirectionAngle ?? 45);
    const prompt =
      `Perform professional photographic studio relighting. Position the key light ${relightDirection(angle)} at ${angle} degrees. Key light color: ${temperatureDescription(Number(input.colorTemperature ?? 15))}. Highlight intensity: ${Number(input.highlightIntensity ?? 65)}%. Light softness: ${Number(input.lightSoftness ?? 50)}%. Rim light strength: ${Number(input.rimLightStrength ?? 40)}%. ${input.catchlightEnhancer === false ? "" : "Add subtle natural eye catchlights."} Preserve ${Number(input.shadowPreservation ?? 80)}% natural ambient shadow density. Retain exact subject identity, face structure, pose, clothing, and original composition.`;
    const result = await callGemini(env, [image, { text: prompt }]);
    return { imageBase64: result.imageBase64, mimeType: result.mimeType };
  }

  if (type === "detail-paint") {
    if (!input.maskBase64) throw new Error("Missing maskBase64 data.");
    const mask = {
      inline_data: {
        mime_type: "image/png",
        data: cleanBase64(input.maskBase64),
      },
    };
    const prompt =
      `Enhance only the masked region of this photo with photorealistic high-frequency details. Target material: ${input.materialTarget || "natural high-resolution surface"}. ${input.promptDescription || "Enhance micro-texture, sharpness, and clarity in the painted area."} Do not modify pixels outside the masked area. Preserve identity, geometry, composition, lighting, color relationships, and original structure. Output the composite result.`;
    const result = await callGemini(env, [image, mask, { text: prompt }]);
    return { imageBase64: result.imageBase64, mimeType: result.mimeType };
  }

  const target = input.target || "subject";
  const prompt =
    `Analyze this image and generate a high-contrast black-and-white segmentation mask for: "${target.toUpperCase()}". The ${target} must be pure white (#FFFFFF) and everything else pure black (#000000). Edges should be crisp and tightly follow the target contours.`;
  const result = await callGemini(env, [image, { text: prompt }]);
  return { maskBase64: result.imageBase64 };
}

export class AIJob extends DurableObject<Env> {
  private async getJob(): Promise<JobRecord | null> {
    return (await this.ctx.storage.get<JobRecord>("job")) || null;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/status") {
      const job = await this.getJob();
      return job ? json(job) : json({ error: "Job not found or expired" }, 404);
    }

    if (request.method === "POST" && url.pathname === "/start") {
      const existing = await this.getJob();
      const body = await request.json() as AIRequest & { __job?: JobRecord };
      const job = existing || body.__job;
      if (!job) return json({ error: "Job not initialized" }, 404);

      const { __job: _ignored, ...input } = body;
      if (!existing) await this.ctx.storage.put("job", job);
      this.ctx.waitUntil(this.runJob(job, input));
      return json({ jobId: job.id, status: "queued" }, 202);
    }

    return json({ error: "Not found" }, 404);
  }

  private async runJob(job: JobRecord, input: AIRequest): Promise<void> {
    try {
      await this.ctx.storage.put("job", { ...job, status: "processing", progress: 20 });
      const result = await processAI(this.env, job.type, input);

      await this.ctx.storage.put("job", {
        ...job,
        status: "completed",
        progress: 100,
        resultImageData: result.imageBase64 && `data:${result.mimeType || "image/png"};base64,${result.imageBase64}`,
        resultMaskData: result.maskBase64 && `data:image/png;base64,${result.maskBase64}`,
      });
    } catch (error) {
      await this.ctx.storage.put("job", {
        ...job,
        status: "failed",
        progress: 100,
        error: error instanceof Error ? error.message : "AI processing failed.",
      });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        status: "healthy",
        service: "Joephotolab Engine",
        timestamp: new Date().toISOString(),
        aiConfigured: Boolean(env.GEMINI_API_KEY),
        runtime: "Cloudflare Workers",
      });
    }

    if (url.pathname.startsWith("/api/ai/")) {
      const match = url.pathname.match(/^\/api\/ai\/(texture|relighting|detail-paint|smart-selection)$/);
      if (request.method === "POST" && match) {
        let input: AIRequest;
        try {
          input = await request.json() as AIRequest;
        } catch {
          return json({ error: "Invalid JSON request body." }, 400);
        }

        if (!input.imageBase64) return json({ error: "Missing imageBase64 data" }, 400);

        const type = match[1] as JobType;
        const jobId = `job_${Date.now()}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
        const stub = env.AI_JOBS.get(env.AI_JOBS.idFromName(jobId));
        const job: JobRecord = {
          id: jobId,
          type,
          status: "queued",
          progress: 5,
          createdAt: Date.now(),
          metadata: {
            provider: "Google Gemini",
            model: GEMINI_MODEL,
            sourceLayerId: input.sourceLayerId,
          },
        };

        await stub.fetch("https://ai-job/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, __job: job }),
        });

        return json({ jobId, status: "queued" }, 202);
      }

      const jobMatch = url.pathname.match(/^\/api\/ai\/jobs\/([^/]+)$/);
      if (request.method === "GET" && jobMatch) {
        const jobId = jobMatch[1];
        const stub = env.AI_JOBS.get(env.AI_JOBS.idFromName(jobId));
        return stub.fetch("https://ai-job/status");
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

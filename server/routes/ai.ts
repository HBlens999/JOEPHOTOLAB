import { Router, Request, Response } from "express";
import { geminiProvider } from "../ai/GeminiProvider.js";
import { jobManager } from "../ai/jobManager.js";

export const aiRouter = Router();

// POST /api/ai/texture - 8K Neural Micro-Texture Synthesis
aiRouter.post("/texture", async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = "image/png", textureType = "Skin Pores", detailFidelity = 75, denoiseThreshold = 20, customPrompt, sourceLayerId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const job = jobManager.createJob("texture", {
      provider: "Google Gemini",
      model: "gemini-3.1-flash-lite-image",
      operation: `8K Micro-Texture (${textureType})`,
      promptVersion: "1.0",
      sourceLayerId,
      createdAt: new Date().toISOString(),
    });

    // Start background processing
    (async () => {
      try {
        jobManager.updateProgress(job.id, 25, "processing");
        const result = await geminiProvider.synthesizeMicroTexture({
          imageBase64,
          mimeType,
          textureType,
          detailFidelity: Number(detailFidelity),
          denoiseThreshold: Number(denoiseThreshold),
          customPrompt,
        });

        jobManager.updateProgress(job.id, 90, "processing");
        const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        jobManager.completeJob(job.id, dataUrl);
      } catch (err: any) {
        console.error("AI Texture job error:", err.message);
        jobManager.failJob(job.id, err.message || "Micro-texture synthesis failed");
      }
    })();

    return res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error: any) {
    console.error("Failed to enqueue texture synthesis:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// POST /api/ai/relighting - Dynamic Studio Relighting
aiRouter.post("/relighting", async (req: Request, res: Response) => {
  try {
    const {
      imageBase64,
      mimeType = "image/png",
      lightDirectionAngle = 45,
      highlightIntensity = 65,
      lightSoftness = 50,
      colorTemperature = 15,
      rimLightStrength = 40,
      catchlightEnhancer = true,
      shadowPreservation = 80,
      sourceLayerId,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const job = jobManager.createJob("relighting", {
      provider: "Google Gemini",
      model: "gemini-3.1-flash-lite-image",
      operation: `Dynamic Studio Relighting (${lightDirectionAngle}°)`,
      promptVersion: "1.0",
      sourceLayerId,
      createdAt: new Date().toISOString(),
    });

    (async () => {
      try {
        jobManager.updateProgress(job.id, 30, "processing");
        const result = await geminiProvider.applyRelighting({
          imageBase64,
          mimeType,
          lightDirectionAngle: Number(lightDirectionAngle),
          highlightIntensity: Number(highlightIntensity),
          lightSoftness: Number(lightSoftness),
          colorTemperature: Number(colorTemperature),
          rimLightStrength: Number(rimLightStrength),
          catchlightEnhancer: Boolean(catchlightEnhancer),
          shadowPreservation: Number(shadowPreservation),
        });

        jobManager.updateProgress(job.id, 90, "processing");
        const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        jobManager.completeJob(job.id, dataUrl);
      } catch (err: any) {
        console.error("AI Relighting job error:", err.message);
        jobManager.failJob(job.id, err.message || "Relighting processing failed");
      }
    })();

    return res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error: any) {
    console.error("Failed to enqueue relighting job:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// POST /api/ai/detail-paint - AI Detail Brush Enhancement
aiRouter.post("/detail-paint", async (req: Request, res: Response) => {
  try {
    const {
      imageBase64,
      mimeType = "image/png",
      maskBase64,
      promptDescription = "Enhance localized surface detail and resolution",
      materialTarget = "skin/fabric",
      sourceLayerId,
    } = req.body;

    if (!imageBase64 || !maskBase64) {
      return res.status(400).json({ error: "Missing imageBase64 or maskBase64 data" });
    }

    const job = jobManager.createJob("detail-paint", {
      provider: "Google Gemini",
      model: "gemini-3.1-flash-lite-image",
      operation: "AI Detail Paint",
      promptVersion: "1.0",
      sourceLayerId,
      createdAt: new Date().toISOString(),
    });

    (async () => {
      try {
        jobManager.updateProgress(job.id, 30, "processing");
        const result = await geminiProvider.applyDetailPaint({
          imageBase64,
          mimeType,
          maskBase64,
          promptDescription,
          materialTarget,
        });

        jobManager.updateProgress(job.id, 90, "processing");
        const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        jobManager.completeJob(job.id, dataUrl);
      } catch (err: any) {
        console.error("AI Detail Paint error:", err.message);
        jobManager.failJob(job.id, err.message || "Detail painting failed");
      }
    })();

    return res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error: any) {
    console.error("Failed to enqueue detail paint job:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// POST /api/ai/smart-selection - AI Segmentation
aiRouter.post("/smart-selection", async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = "image/png", target = "subject", sourceLayerId } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const job = jobManager.createJob("smart-selection", {
      provider: "Google Gemini",
      model: "gemini-3.1-flash-lite-image",
      operation: `Smart Selection (${target})`,
      promptVersion: "1.0",
      sourceLayerId,
      createdAt: new Date().toISOString(),
    });

    (async () => {
      try {
        jobManager.updateProgress(job.id, 40, "processing");
        const result = await geminiProvider.generateSmartSelection({
          imageBase64,
          mimeType,
          target,
        });

        jobManager.updateProgress(job.id, 95, "processing");
        const dataUrl = `data:image/png;base64,${result.maskBase64}`;
        jobManager.completeJob(job.id, undefined, dataUrl);
      } catch (err: any) {
        console.error("Smart selection job error:", err.message);
        jobManager.failJob(job.id, err.message || "Smart selection failed");
      }
    })();

    return res.status(202).json({ jobId: job.id, status: "queued" });
  } catch (error: any) {
    console.error("Failed to enqueue smart selection job:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// GET /api/ai/jobs/:jobId - Poll job status
aiRouter.get("/jobs/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found or expired" });
  }

  return res.json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    resultImageData: job.resultImageData,
    resultMaskData: job.resultMaskData,
    error: job.error,
    metadata: job.metadata,
  });
});

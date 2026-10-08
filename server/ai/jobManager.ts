import { GoogleGenAI } from "@google/genai";

export interface AIJob {
  id: string;
  type: "texture" | "relighting" | "detail-paint" | "smart-selection";
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  createdAt: number;
  resultImageData?: string; // base64 or data URL
  resultMaskData?: string; // for smart selection
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    operation: string;
    promptVersion: string;
    sourceLayerId?: string;
    createdAt: string;
  };
}

export class JobManager {
  private jobs = new Map<string, AIJob>();

  createJob(type: AIJob["type"], metadata?: AIJob["metadata"]): AIJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: AIJob = {
      id,
      type,
      status: "queued",
      progress: 5,
      createdAt: Date.now(),
      metadata,
    };
    this.jobs.set(id, job);

    // Auto-cleanup jobs older than 1 hour
    this.cleanup();
    return job;
  }

  getJob(id: string): AIJob | undefined {
    return this.jobs.get(id);
  }

  updateProgress(id: string, progress: number, status: AIJob["status"] = "processing") {
    const job = this.jobs.get(id);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      job.status = status;
    }
  }

  completeJob(id: string, resultImageData?: string, resultMaskData?: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.resultImageData = resultImageData;
      job.resultMaskData = resultMaskData;
    }
  }

  failJob(id: string, errorMessage: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.status = "failed";
      job.error = errorMessage;
      job.progress = 100;
    }
  }

  private cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAt < oneHourAgo) {
        this.jobs.delete(id);
      }
    }
  }
}

export const jobManager = new JobManager();

// Google GenAI Singleton Initialization
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

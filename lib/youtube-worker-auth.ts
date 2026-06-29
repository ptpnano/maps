import { YoutubeWorker } from "@prisma/client";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

export function getGlobalYoutubeWorkerApiKey() {
  return process.env.YOUTUBE_WORKER_API_KEY || process.env.YTB_WORKER_API_KEY || "";
}

export function getProvidedWorkerApiKey(req: Request) {
  return req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}

export function hashWorkerApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function generateWorkerApiKey() {
  return `ytbw_${randomBytes(32).toString("base64url")}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function authenticateYoutubeWorker(
  req: Request,
  requestedWorkerKey?: string | null,
): Promise<{ worker: YoutubeWorker | null; workerKey: string } | { error: string; status: number }> {
  const provided = getProvidedWorkerApiKey(req);
  if (!provided) return { error: "Unauthorized", status: 401 };

  const globalKey = getGlobalYoutubeWorkerApiKey();
  if (globalKey && safeEqual(provided, globalKey)) {
    const workerKey = String(requestedWorkerKey || req.headers.get("x-worker-id") || "").trim();
    if (!workerKey) return { error: "Missing worker key", status: 400 };
    return { worker: null, workerKey };
  }

  const apiKeyHash = hashWorkerApiKey(provided);
  const worker = await db.youtubeWorker.findFirst({ where: { apiKeyHash } });
  if (!worker) return { error: "Unauthorized", status: 401 };
  if (requestedWorkerKey && requestedWorkerKey !== worker.workerKey) {
    return { error: "Worker key does not match API key", status: 401 };
  }
  if (worker.status === "disabled") return { error: "Worker disabled", status: 403 };
  return { worker, workerKey: worker.workerKey };
}

export function workerAuthResponse(error: string, status = 401) {
  return NextResponse.json({ error }, { status });
}

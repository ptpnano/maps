import { db } from "@/lib/db";
import { authenticateYoutubeWorker, workerAuthResponse } from "@/lib/youtube-worker-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const heartbeatSchema = z.object({
  workerKey: z.string().min(3).max(120),
  label: z.string().max(255).optional(),
  status: z.string().max(50).optional().default("online"),
  capabilities: z.array(z.string().max(50)).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: Request) {
  const parsed = heartbeatSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid heartbeat", details: parsed.error.format() }, { status: 400 });
  }

  const data = parsed.data;
  const auth = await authenticateYoutubeWorker(req, data.workerKey);
  if ("error" in auth) return workerAuthResponse(auth.error, auth.status);

  const worker = await db.youtubeWorker.upsert({
    where: { workerKey: auth.workerKey },
    update: {
      label: data.label,
      status: data.status,
      capabilities: data.capabilities,
      metadata: data.metadata as Prisma.InputJsonValue,
      lastSeenAt: new Date(),
    },
    create: {
      workerKey: auth.workerKey,
      label: data.label,
      status: data.status,
      capabilities: data.capabilities,
      metadata: data.metadata as Prisma.InputJsonValue,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, worker });
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateWorkerApiKey, hashWorkerApiKey } from "@/lib/youtube-worker-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  workerKey: z.string().min(3).max(120).regex(/^[A-Za-z0-9._-]+$/).optional(),
  label: z.string().max(255).optional(),
  capabilities: z.array(z.enum(["like", "view", "comment", "sub"])).optional().default(["like", "view", "comment", "sub"]),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workers = await db.youtubeWorker.findMany({
    orderBy: { lastSeenAt: "desc" },
    include: {
      jobLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  const stats = await db.youtubeWorkerJobLog.groupBy({
    by: ["workerKey", "status"],
    _count: { _all: true },
  });

  return NextResponse.json({ workers, stats });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid worker data", details: parsed.error.format() }, { status: 400 });
  }

  const apiKey = generateWorkerApiKey();
  const apiKeyHash = hashWorkerApiKey(apiKey);
  const apiKeyPrefix = apiKey.slice(0, 12);
  const workerKey = parsed.data.workerKey || `ytb-${Date.now().toString(36)}`;

  const worker = await db.youtubeWorker.upsert({
    where: { workerKey },
    update: {
      label: parsed.data.label || workerKey,
      capabilities: parsed.data.capabilities,
      apiKeyHash,
      apiKeyPrefix,
      status: "offline",
    },
    create: {
      workerKey,
      label: parsed.data.label || workerKey,
      capabilities: parsed.data.capabilities,
      apiKeyHash,
      apiKeyPrefix,
      status: "offline",
    },
  });

  return NextResponse.json({ worker, apiKey });
}

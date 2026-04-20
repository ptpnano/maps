import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  scanEnabled: z.boolean().optional(),
  scanTimeHour: z.number().min(0).max(23).optional(),
  scanTimeMinute: z.number().min(0).max(59).optional(),
  scanDelayMs: z.number().min(500).max(30000).optional(),
  scanProxyEnabled: z.boolean().optional(),
  scanProxyUrl: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
  return NextResponse.json({
    scanEnabled: config?.scanEnabled ?? false,
    scanTimeHour: config?.scanTimeHour ?? 9,
    scanTimeMinute: config?.scanTimeMinute ?? 0,
    scanDelayMs: config?.scanDelayMs ?? 3000,
    scanProxyEnabled: config?.scanProxyEnabled ?? false,
    scanProxyUrl: config?.scanProxyUrl ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }
  const config = await db.systemConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...result.data },
    update: result.data,
  });
  return NextResponse.json({ success: true, config });
}

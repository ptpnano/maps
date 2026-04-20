import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

async function getOrCreateConfig() {
  let config = await db.systemConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await db.systemConfig.create({
      data: { id: 'default', holdingDays: 7, jobTimeoutMinutes: 30 },
    });
  }
  return config;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const config = await getOrCreateConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config GET error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const updateSchema = z.object({
  holdingDays: z.number().int().min(1).max(90).optional(),
  jobTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
  bankName: z.string().max(255).nullable().optional(),
  bankAccount: z.string().max(50).nullable().optional(),
  bankAccountHolder: z.string().max(255).nullable().optional(),
  bankQrUrl: z.string().max(2000).nullable().optional(),
  dispatchMode: z.enum(['manual', 'auto']).optional(),
  autoAssignAlgorithm: z.enum(['trust_score', 'least_jobs', 'highest_level', 'fifo']).optional(),
  autoAssignIntervalMinutes: z.number().int().min(1).max(1440).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.format() }, { status: 400 });
  }

  await getOrCreateConfig();
  try {
    const config = await db.systemConfig.update({
      where: { id: 'default' },
      data: parsed.data,
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error("Config PATCH error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

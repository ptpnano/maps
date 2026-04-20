import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const tierSchema = z.object({
  level: z.enum(['basic', 'silver', 'vip']),
  name: z.string().min(1).max(100),
  pricePerReview: z.number().positive(),
  workerPayout: z.number().positive(),
  platformFee: z.number().nonnegative(),
  minReviews: z.number().int().min(1),
  maxReviews: z.number().int().min(1),
  warrantyDays: z.number().int().min(1),
  maxRefills: z.number().int().min(0),
  minAccountLevel: z.number().int().min(1).max(10).optional().default(1),
  maxAccountLevel: z.number().int().min(1).max(10).optional().default(10),
  isActive: z.boolean().optional().default(true),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const tiers = await db.pricingTier.findMany({ orderBy: { pricePerReview: 'asc' } });
    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Admin pricing GET error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const parsed = tierSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.format() }, { status: 400 });
    const tier = await db.pricingTier.create({ data: parsed.data });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (error) {
    console.error("Admin pricing POST error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

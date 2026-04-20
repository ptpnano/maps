import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pricePerReview: z.number().positive().optional(),
  workerPayout: z.number().positive().optional(),
  platformFee: z.number().nonnegative().optional(),
  minReviews: z.number().int().min(1).optional(),
  maxReviews: z.number().int().min(1).optional(),
  warrantyDays: z.number().int().min(1).optional(),
  maxRefills: z.number().int().min(0).optional(),
  minAccountLevel: z.number().int().min(1).max(10).optional(),
  maxAccountLevel: z.number().int().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return null;
  return session;
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data', details: parsed.error.format() }, { status: 400 });
    const tier = await db.pricingTier.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ tier });
  } catch (error) {
    console.error("Admin pricing PATCH error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check if any campaign references this tier
    const campaignCount = await db.campaign.count({ where: { pricingTierId: id } });
    if (campaignCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa gói giá này vì đang được sử dụng bởi ${campaignCount} chiến dịch.` },
        { status: 400 }
      );
    }

    await db.pricingTier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin pricing DELETE error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const claimSchema = z.object({
  accountId: z.string().uuid("Account ID không hợp lệ"),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'worker' || (session.user as any).workerStatus !== 'approved') {
      return NextResponse.json({ error: "Unauthorized or not approved" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Vui lòng chọn tài khoản Google" }, { status: 400 });
    }

    const { accountId } = parsed.data;
    const workerId = (session.user as any).id;

    // Validate account belongs to worker and is active
    const account = await db.workerAccount.findFirst({
      where: { id: accountId, workerId, status: 'active' },
    });
    if (!account) {
      return NextResponse.json({ error: "Tài khoản không hợp lệ hoặc đang tạm dừng" }, { status: 400 });
    }

    // Get review item to check map usage and tier requirements
    const reviewItem = await db.reviewItem.findUnique({
      where: { id, status: 'pending' },
      include: {
        campaign: { select: { mapLocationId: true } },
        pricingTier: { select: { minAccountLevel: true, maxAccountLevel: true, name: true } },
      },
    });
    if (!reviewItem) {
      return NextResponse.json({ error: "Job không còn khả dụng" }, { status: 409 });
    }

    // Check account level meets tier minimum requirement
    // Higher-level accounts can always do lower-level work
    if (reviewItem.pricingTier) {
      const { minAccountLevel, name } = reviewItem.pricingTier;
      if (account.level < minAccountLevel) {
        return NextResponse.json({
          error: `Tài khoản level ${account.level} không đủ yêu cầu cho gói "${name}" (cần tối thiểu level ${minAccountLevel})`
        }, { status: 400 });
      }
    }

    // Check account hasn't already reviewed this map location
    const existingUsage = await db.accountMapUsage.findUnique({
      where: {
        accountId_mapLocationId: {
          accountId,
          mapLocationId: reviewItem.campaign.mapLocationId,
        },
      },
    });
    if (existingUsage) {
      return NextResponse.json({ error: "Tài khoản này đã review địa điểm này rồi" }, { status: 400 });
    }

    // Get job timeout from SystemConfig
    let timeoutMinutes = 30;
    const config = await db.systemConfig.findUnique({ where: { id: 'default' } });
    if (config) timeoutMinutes = config.jobTimeoutMinutes;

    const now = new Date();
    const claimDeadline = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

    // Optimistic lock + AccountMapUsage in same transaction (prevent TOCTOU)
    try {
      await db.$transaction(async (tx) => {
        const updateResult = await tx.reviewItem.updateMany({
          where: { id, status: 'pending' },
          data: {
            status: 'assigned',
            assignedWorkerId: workerId,
            assignedAccountId: accountId,
            claimedAt: now,
            claimDeadline,
          },
        });

        if (updateResult.count === 0) {
          throw new Error('ALREADY_CLAIMED');
        }

        await tx.accountMapUsage.create({
          data: {
            accountId,
            mapLocationId: reviewItem.campaign.mapLocationId,
          },
        });
      });
    } catch (txError: any) {
      if (txError.message === 'ALREADY_CLAIMED') {
        return NextResponse.json({ error: "Job đã được người khác nhận" }, { status: 409 });
      }
      throw txError;
    }

    const updatedJob = await db.reviewItem.findUnique({ where: { id } });
    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error("Claim job error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

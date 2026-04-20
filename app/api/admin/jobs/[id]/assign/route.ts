import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const assignSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('direct'),
    workerId: z.string().uuid(),
    accountId: z.string().uuid(),
  }),
  z.object({
    mode: z.literal('public'),
  }),
]);

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = assignSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Load job
    const job = await db.reviewItem.findUnique({
      where: { id: params.id },
      include: {
        pricingTier: { select: { minAccountLevel: true, maxAccountLevel: true, name: true } },
        campaign: { select: { mapLocationId: true } }
      }
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status !== 'pending') {
      return NextResponse.json({ error: `Job đang ở trạng thái '${job.status}', không thể giao` }, { status: 400 });
    }

    const data = result.data;

    if (data.mode === 'public') {
      // Public mode: make job available for any worker to claim immediately
      const now = new Date();
      await db.reviewItem.update({
        where: { id: params.id },
        data: {
          scheduledAt: now,
          dispatchedAt: now,
        }
      });
      return NextResponse.json({ success: true, mode: 'public' });
    }

    // Direct mode
    const { workerId, accountId } = data;

    // Validate account belongs to worker and is active
    const account = await db.workerAccount.findFirst({
      where: { id: accountId, workerId, status: 'active' }
    });
    if (!account) {
      return NextResponse.json({ error: "Tài khoản GG không hợp lệ hoặc đang bị khoá" }, { status: 400 });
    }

    // Validate level match
    if (job.pricingTier) {
      const { minAccountLevel } = job.pricingTier;
      if (account.level < minAccountLevel) {
        return NextResponse.json({
          error: `Tài khoản level ${account.level} không đáp ứng yêu cầu tối thiểu level ${minAccountLevel} của gói này`
        }, { status: 400 });
      }
    }

    const claimDeadline = new Date();
    claimDeadline.setHours(claimDeadline.getHours() + 24);

    // Assign in transaction
    await db.$transaction(async (tx) => {
      await tx.reviewItem.update({
        where: { id: params.id },
        data: {
          status: 'assigned',
          assignedWorkerId: workerId,
          assignedAccountId: accountId,
          claimDeadline,
        }
      });

      // Upsert map usage
      const mapLocationId = job.campaign?.mapLocationId;
      if (mapLocationId) {
        await tx.accountMapUsage.upsert({
          where: { accountId_mapLocationId: { accountId, mapLocationId } },
          update: { usedAt: new Date() },
          create: { accountId, mapLocationId, usedAt: new Date() }
        });
      }

      // Notify worker
      await tx.notification.create({
        data: {
          userId: workerId,
          type: 'job_assigned',
          title: 'Việc mới được giao',
          message: `Admin đã giao việc cho bạn. Vui lòng hoàn thành trong 24 giờ.`,
          referenceId: params.id,
          referenceType: 'review_item',
        }
      });
    });

    return NextResponse.json({ success: true, mode: 'direct' });
  } catch (error) {
    console.error("Admin assign job error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

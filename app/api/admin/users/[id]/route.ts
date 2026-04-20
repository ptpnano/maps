import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  workerStatus: z.enum(['pending', 'approved', 'rejected', 'banned']).optional(),
  isActive: z.boolean().optional(),
  trustScore: z.number().int().optional()
});

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, email: true, name: true, role: true, workerStatus: true,
        trustScore: true, isActive: true, phone: true, createdAt: true,
        workerAccounts: {
          include: {
            _count: { select: { reviewItems: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        wallet: { select: { balance: true } },
        _count: { select: { campaigns: true } },
      }
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin get user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: result.data,
      select: { id: true, email: true, name: true, role: true, workerStatus: true, trustScore: true, isActive: true }
    });

    // Create notification for worker approval
    if (result.data.workerStatus === 'approved') {
      await db.notification.create({
        data: {
          userId: params.id,
          type: 'worker_approved',
          title: 'Tài khoản đã được duyệt',
          message: 'Tài khoản worker của bạn đã được duyệt. Bạn có thể bắt đầu nhận job ngay bây giờ.'
        }
      });
    } else if (result.data.workerStatus === 'rejected') {
      await db.notification.create({
        data: {
          userId: params.id,
          type: 'worker_rejected',
          title: 'Tài khoản bị từ chối',
          message: 'Tài khoản worker của bạn đã bị từ chối. Vui lòng liên hệ admin để biết thêm chi tiết.'
        }
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const worker = await db.user.findUnique({
      where: { id }
    });

    if (!worker || worker.role !== 'worker') {
      return NextResponse.json({ error: "Thợ kiểm duyệt không tồn tại" }, { status: 404 });
    }

    if (worker.workerStatus === 'approved') {
      return NextResponse.json({ error: "Thợ đã được duyệt từ trước" }, { status: 400 });
    }

    const updatedWorker = await db.user.update({
      where: { id },
      data: {
        workerStatus: 'approved'
      }
    });

    // Send notification to worker
    await db.notification.create({
      data: {
        userId: id,
        type: 'worker_approved',
        title: 'Tài khoản đã được duyệt',
        message: 'Chúc mừng! Tài khoản worker của bạn đã được phê duyệt. Bạn có thể bắt đầu nhận việc ngay bây giờ.',
      }
    });

    return NextResponse.json({ success: true, user: updatedWorker });
  } catch (error) {
    console.error("Approve worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

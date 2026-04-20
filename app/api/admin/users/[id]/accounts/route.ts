import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await db.workerAccount.findMany({
      where: { workerId: params.id },
      include: {
        _count: { select: { reviewItems: true } },
        reviewItems: {
          where: { status: 'live' },
          select: { id: true },
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Admin get accounts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const updateSchema = z.object({
  accountName: z.string().min(1).max(200).optional(),
  level: z.number().int().min(1).max(10).optional(),
  status: z.enum(['active', 'cooldown', 'suspended']).optional(),
});

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.workerAccount.findFirst({
      where: { id: accountId, workerId: params.id }
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const updated = await db.workerAccount.update({
      where: { id: accountId },
      data: result.data,
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (error) {
    console.error("Admin update account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

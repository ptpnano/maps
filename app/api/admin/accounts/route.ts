import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const level = searchParams.get('level') || '';

    const where: any = {};
    if (status) where.status = status;
    if (level) where.level = parseInt(level);
    if (search) {
      where.OR = [
        { accountName: { contains: search, mode: 'insensitive' } },
        { accountEmail: { contains: search, mode: 'insensitive' } },
        { worker: { name: { contains: search, mode: 'insensitive' } } },
        { worker: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      db.workerAccount.findMany({
        where,
        include: {
          worker: { select: { id: true, name: true, email: true, trustScore: true } },
          _count: { select: { reviewItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workerAccount.count({ where }),
    ]);

    return NextResponse.json({ accounts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin accounts list error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const updateSchema = z.object({
  accountName: z.string().min(1).max(200).optional(),
  level: z.number().int().min(1).max(10).optional(),
  status: z.enum(['active', 'cooldown', 'banned']).optional(),
});

export async function PATCH(req: Request) {
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

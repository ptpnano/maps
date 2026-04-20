import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createAccountSchema = z.object({
  accountName: z.string().min(1).max(255),
  accountEmail: z.string().email().optional(),
  profileUrl: z.string().url().optional(),
  level: z.number().int().min(1).max(10)
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'worker') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.workerStatus !== 'approved') {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt bởi admin" }, { status: 401 });
    }

    const accounts = await db.workerAccount.findMany({
      where: { workerId: session.user.id },
      include: {
        _count: { select: { reviewItems: true, mapUsage: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Fetch accounts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'worker') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.workerStatus !== 'approved') {
      return NextResponse.json({ error: "Tài khoản chưa được duyệt bởi admin" }, { status: 401 });
    }

    const body = await req.json();
    const result = createAccountSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 });
    }

    const account = await db.workerAccount.create({
      data: {
        workerId: session.user.id,
        accountName: result.data.accountName,
        accountEmail: result.data.accountEmail,
        profileUrl: result.data.profileUrl,
        level: result.data.level
      }
    });

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

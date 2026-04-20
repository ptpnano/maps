import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(['active', 'cooldown']).optional(),
  profileUrl: z.string().max(2000).nullable().optional(),
  accountEmail: z.string().email().nullable().optional(),
  accountName: z.string().min(1).max(255).optional(),
  level: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'worker' || (session.user as any).workerStatus !== 'approved') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await db.workerAccount.findFirst({
      where: { id: params.id, workerId: (session.user as any).id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await db.workerAccount.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error("Update worker account error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

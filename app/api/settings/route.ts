import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).optional(),
  workerBio: z.string().max(1000).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        workerStatus: true, trustScore: true, workerBio: true, avatarUrl: true,
        createdAt: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if this is a password change
    if (body.currentPassword) {
      const result = changePasswordSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      }

      const user = await db.user.findUnique({ where: { id: session.user.id } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const valid = await bcrypt.compare(result.data.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
      }

      const hash = await bcrypt.hash(result.data.newPassword, 12);
      await db.user.update({
        where: { id: session.user.id },
        data: { passwordHash: hash }
      });

      return NextResponse.json({ success: true, message: "Đã đổi mật khẩu" });
    }

    // Profile update
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: result.data,
      select: { id: true, name: true, phone: true, workerBio: true }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

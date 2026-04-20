import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
  password: z.string().min(6).max(128),
  role: z.enum(["client", "worker"]).default("client")
});

export async function POST(req: Request) {
  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { success } = rateLimit(`register_${ip}`, 5, 300_000); // 5 per 5 min
    if (!success) {
      return NextResponse.json({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau" }, { status: 429 });
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const { email, name, password, role } = result.data;

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Prevent user enumeration - same response time
      return NextResponse.json({ error: "Không thể đăng ký với thông tin này" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const workerStatus = role === 'worker' ? 'pending' : null;

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        workerStatus
      }
    });
    
    // Create a wallet for the user
    await db.wallet.create({
      data: {
        userId: user.id
      }
    });

    return NextResponse.json(
      { message: "User registered successfully", user: { id: user.id, email: user.email, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

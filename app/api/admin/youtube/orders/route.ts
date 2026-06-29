import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const serviceType = searchParams.get("serviceType") as YoutubeServiceType | null;
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const where: any = {
      ...(serviceType ? { serviceType } : {}),
      ...(status && status !== "all" ? { status } : {}),
      ...(search ? {
        OR: [
          { client: { email: { contains: search, mode: "insensitive" } } },
          { client: { name: { contains: search, mode: "insensitive" } } },
          { targets: { some: { targetKey: { contains: search, mode: "insensitive" } } } },
        ],
      } : {}),
    };

    const [orders, total] = await Promise.all([
      db.youtubeOrder.findMany({
        where,
        include: {
          client: { select: { id: true, email: true, name: true } },
          targets: true,
          serviceConfig: true,
          events: {
            orderBy: { createdAt: "desc" },
            take: 12,
            include: { actor: { select: { id: true, email: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.youtubeOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin YouTube orders GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

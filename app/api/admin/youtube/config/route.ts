import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureYoutubeServiceConfigs } from "@/lib/youtube-config";
import { Prisma, YoutubeServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const itemSchema = z.object({
  serviceType: z.nativeEnum(YoutubeServiceType),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  minQuantity: z.number().int().min(1).optional(),
  maxQuantity: z.number().int().min(1).optional(),
  defaultQuantity: z.number().int().min(1).optional(),
  pricePerUnit: z.number().min(0).optional(),
  requireApproval: z.boolean().optional(),
  overdeliveryPercent: z.number().min(0).max(500).optional(),
  defaultConfig: z.record(z.string(), z.unknown()).optional(),
  telegramEnabled: z.boolean().optional(),
});

const telegramSchema = z.object({
  telegramBotToken: z.string().max(300).nullable().optional(),
  telegramChatId: z.string().max(100).nullable().optional(),
  telegramOrderNotifications: z.boolean().optional(),
});

const systemSchema = z.object({
  youtubeOrderTimeoutHours: z.number().int().min(1).max(8760).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const configs = await ensureYoutubeServiceConfigs();
    const systemConfig = await db.systemConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", holdingDays: 7, jobTimeoutMinutes: 30 },
    });
    return NextResponse.json({
      configs,
      system: {
        youtubeOrderTimeoutHours: systemConfig.youtubeOrderTimeoutHours,
        youtubeOverdueScanLastAt: systemConfig.youtubeOverdueScanLastAt,
        youtubeOverdueScanSource: systemConfig.youtubeOverdueScanSource,
        youtubeOverdueScanStatus: systemConfig.youtubeOverdueScanStatus,
        youtubeOverdueScanCompleted: systemConfig.youtubeOverdueScanCompleted,
      },
      telegram: {
        telegramBotToken: systemConfig.telegramBotToken || "",
        telegramChatId: systemConfig.telegramChatId || "",
        telegramOrderNotifications: systemConfig.telegramOrderNotifications,
        envConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      },
    });
  } catch (error) {
    console.error("Admin YouTube config GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await ensureYoutubeServiceConfigs();
    const body = await req.json();
    const rows = Array.isArray(body?.configs) ? body.configs : [body];
    const parsed = z.array(itemSchema).safeParse(rows);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const configs = [];
    for (const row of parsed.data) {
      if (row.minQuantity && row.maxQuantity && row.minQuantity > row.maxQuantity) {
        return NextResponse.json({ error: "Min quantity không được lớn hơn max quantity" }, { status: 400 });
      }
      const { serviceType, defaultConfig, ...data } = row;
      configs.push(await db.youtubeServiceConfig.update({
        where: { serviceType },
        data: {
          ...data,
          ...(defaultConfig ? { defaultConfig: defaultConfig as Prisma.InputJsonValue } : {}),
        },
      }));
    }

    const telegramParsed = telegramSchema.safeParse(body?.telegram || {});
    if (!telegramParsed.success) {
      return NextResponse.json({ error: "Invalid telegram config", details: telegramParsed.error.format() }, { status: 400 });
    }
    if (body?.telegram) {
      await db.systemConfig.upsert({
        where: { id: "default" },
        update: telegramParsed.data,
        create: {
          id: "default",
          holdingDays: 7,
          jobTimeoutMinutes: 30,
          ...telegramParsed.data,
        },
      });
    }

    const systemParsed = systemSchema.safeParse(body?.system || {});
    if (!systemParsed.success) {
      return NextResponse.json({ error: "Invalid system config", details: systemParsed.error.format() }, { status: 400 });
    }
    if (body?.system) {
      await db.systemConfig.upsert({
        where: { id: "default" },
        update: systemParsed.data,
        create: {
          id: "default",
          holdingDays: 7,
          jobTimeoutMinutes: 30,
          youtubeOrderTimeoutHours: 24,
          ...systemParsed.data,
        },
      });
    }

    const systemConfig = await db.systemConfig.findUnique({ where: { id: "default" } });
    return NextResponse.json({
      configs,
      system: {
        youtubeOrderTimeoutHours: systemConfig?.youtubeOrderTimeoutHours || 24,
        youtubeOverdueScanLastAt: systemConfig?.youtubeOverdueScanLastAt || null,
        youtubeOverdueScanSource: systemConfig?.youtubeOverdueScanSource || null,
        youtubeOverdueScanStatus: systemConfig?.youtubeOverdueScanStatus || null,
        youtubeOverdueScanCompleted: systemConfig?.youtubeOverdueScanCompleted || 0,
      },
      telegram: {
        telegramBotToken: systemConfig?.telegramBotToken || "",
        telegramChatId: systemConfig?.telegramChatId || "",
        telegramOrderNotifications: Boolean(systemConfig?.telegramOrderNotifications),
        envConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      },
    });
  } catch (error) {
    console.error("Admin YouTube config PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

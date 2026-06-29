import { auth } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  telegramBotToken: z.string().max(300).optional().nullable(),
  telegramChatId: z.string().max(100).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid telegram config", details: parsed.error.format() }, { status: 400 });
    }

    const sent = await sendTelegramMessage(
      `Test Telegram Maps\nAdmin: ${session.user.email || session.user.id}\nNếu thấy tin này thì cấu hình Telegram đang hoạt động.`,
      {
        token: parsed.data.telegramBotToken || null,
        chatId: parsed.data.telegramChatId || null,
        force: true,
      },
    );

    if (sent.skipped) {
      return NextResponse.json({ error: "Missing Telegram bot token or chat ID" }, { status: 400 });
    }
    if (!sent.ok) {
      return NextResponse.json({ error: "Telegram send failed", detail: sent }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram test error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

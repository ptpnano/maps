import { db } from "./db";

type TelegramOptions = {
  token?: string | null;
  chatId?: string | null;
  force?: boolean;
};

export async function sendTelegramMessage(message: string, options: TelegramOptions = {}) {
  let token = options.token || process.env.TELEGRAM_BOT_TOKEN || "";
  let chatId = options.chatId || process.env.TELEGRAM_CHAT_ID || "";

  if (!token || !chatId) {
    const config = await db.systemConfig.findUnique({ where: { id: "default" } }).catch(() => null);
    if (config?.telegramOrderNotifications || options.force) {
      token = token || config.telegramBotToken || "";
      chatId = chatId || config.telegramChatId || "";
    }
  }

  if (!token || !chatId) return { skipped: true };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true };
  } catch (error) {
    console.error("Telegram notification error:", error);
    return { ok: false };
  }
}

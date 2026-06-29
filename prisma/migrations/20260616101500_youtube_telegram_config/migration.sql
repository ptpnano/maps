ALTER TABLE "system_config"
ADD COLUMN IF NOT EXISTS "telegram_bot_token" TEXT,
ADD COLUMN IF NOT EXISTS "telegram_chat_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "telegram_order_notifications" BOOLEAN NOT NULL DEFAULT false;

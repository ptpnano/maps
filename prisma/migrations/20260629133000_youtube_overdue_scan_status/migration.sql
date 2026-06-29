ALTER TABLE "system_config"
ADD COLUMN IF NOT EXISTS "youtube_overdue_scan_last_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "youtube_overdue_scan_source" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "youtube_overdue_scan_status" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "youtube_overdue_scan_completed" INTEGER NOT NULL DEFAULT 0;

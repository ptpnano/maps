ALTER TABLE "youtube_order_targets"
  ADD COLUMN IF NOT EXISTS "is_paused" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "youtube_order_targets_is_paused_status_idx"
ON "youtube_order_targets"("is_paused", "ytb_status");

ALTER TABLE "youtube_workers"
  ADD COLUMN IF NOT EXISTS "api_key_hash" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "api_key_prefix" VARCHAR(24);

CREATE INDEX IF NOT EXISTS "youtube_workers_api_key_hash_idx" ON "youtube_workers"("api_key_hash");

CREATE TABLE IF NOT EXISTS "youtube_worker_job_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_id" UUID,
  "worker_key" VARCHAR(120) NOT NULL,
  "order_id" UUID,
  "target_id" UUID,
  "service_type" "YoutubeServiceType",
  "target_key" VARCHAR(255),
  "action" VARCHAR(50) NOT NULL,
  "status" VARCHAR(50),
  "quota_done" INTEGER,
  "quota_total" INTEGER,
  "error" TEXT,
  "detail" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "youtube_worker_job_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "youtube_worker_job_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "youtube_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_job_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "youtube_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_job_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "youtube_order_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "youtube_worker_job_logs_worker_key_created_at_idx" ON "youtube_worker_job_logs"("worker_key", "created_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_job_logs_target_id_created_at_idx" ON "youtube_worker_job_logs"("target_id", "created_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_job_logs_action_status_created_at_idx" ON "youtube_worker_job_logs"("action", "status", "created_at");

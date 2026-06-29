CREATE TABLE IF NOT EXISTS "youtube_workers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_key" VARCHAR(120) NOT NULL,
  "label" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'online',
  "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "youtube_workers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "youtube_workers_worker_key_key" ON "youtube_workers"("worker_key");
CREATE INDEX IF NOT EXISTS "youtube_workers_status_last_seen_at_idx" ON "youtube_workers"("status", "last_seen_at");

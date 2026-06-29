CREATE TABLE IF NOT EXISTS "youtube_worker_claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_id" UUID,
  "worker_key" VARCHAR(120) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'claimed',
  "lease_until" TIMESTAMPTZ NOT NULL,
  "total_claimed" INTEGER NOT NULL DEFAULT 0,
  "total_success" INTEGER NOT NULL DEFAULT 0,
  "total_failed" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "youtube_worker_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "youtube_worker_claims_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "youtube_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "youtube_worker_claims_worker_key_created_at_idx" ON "youtube_worker_claims"("worker_key", "created_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_claims_status_lease_until_idx" ON "youtube_worker_claims"("status", "lease_until");

CREATE TABLE IF NOT EXISTS "youtube_worker_claim_targets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claim_id" UUID NOT NULL,
  "worker_key" VARCHAR(120) NOT NULL,
  "order_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "service_type" "YoutubeServiceType" NOT NULL,
  "target_key" VARCHAR(255) NOT NULL,
  "target_url" TEXT NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'claimed',
  "claimed_quantity" INTEGER NOT NULL,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "lease_until" TIMESTAMPTZ NOT NULL,
  "last_error" TEXT,
  "detail" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "youtube_worker_claim_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "youtube_worker_claim_targets_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "youtube_worker_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_claim_targets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "youtube_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_claim_targets_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "youtube_order_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "youtube_worker_claim_targets_worker_key_created_at_idx" ON "youtube_worker_claim_targets"("worker_key", "created_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_claim_targets_target_id_status_lease_until_idx" ON "youtube_worker_claim_targets"("target_id", "status", "lease_until");
CREATE INDEX IF NOT EXISTS "youtube_worker_claim_targets_status_lease_until_idx" ON "youtube_worker_claim_targets"("status", "lease_until");

CREATE TABLE IF NOT EXISTS "youtube_worker_action_histories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claim_target_id" UUID,
  "order_id" UUID,
  "target_id" UUID,
  "worker_key" VARCHAR(120) NOT NULL,
  "service_type" "YoutubeServiceType",
  "target_key" VARCHAR(255),
  "gmail" VARCHAR(255),
  "ip" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL,
  "acted_at" TIMESTAMPTZ NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "youtube_worker_action_histories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "youtube_worker_action_histories_claim_target_id_fkey" FOREIGN KEY ("claim_target_id") REFERENCES "youtube_worker_claim_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_action_histories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "youtube_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "youtube_worker_action_histories_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "youtube_order_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "youtube_worker_action_histories_worker_key_acted_at_idx" ON "youtube_worker_action_histories"("worker_key", "acted_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_action_histories_target_id_acted_at_idx" ON "youtube_worker_action_histories"("target_id", "acted_at");
CREATE INDEX IF NOT EXISTS "youtube_worker_action_histories_gmail_target_key_idx" ON "youtube_worker_action_histories"("gmail", "target_key");

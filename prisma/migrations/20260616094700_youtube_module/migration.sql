CREATE TYPE "YoutubeServiceType" AS ENUM ('like', 'view', 'comment', 'sub');

CREATE TYPE "YoutubeOrderStatus" AS ENUM ('pending_review', 'queued', 'running', 'partial', 'completed', 'rejected', 'cancelled', 'failed');

CREATE TABLE "youtube_service_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_type" "YoutubeServiceType" NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "min_quantity" INTEGER NOT NULL DEFAULT 1,
  "max_quantity" INTEGER NOT NULL DEFAULT 10000,
  "price_per_unit" DECIMAL(15, 2) NOT NULL DEFAULT 1.00,
  "require_approval" BOOLEAN NOT NULL DEFAULT true,
  "overdelivery_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  "default_quantity" INTEGER NOT NULL DEFAULT 100,
  "default_config" JSONB NOT NULL DEFAULT '{}',
  "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "youtube_service_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "youtube_service_configs_service_type_key" ON "youtube_service_configs"("service_type");

CREATE TABLE "youtube_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "service_type" "YoutubeServiceType" NOT NULL,
  "service_config_id" UUID NOT NULL,
  "status" "YoutubeOrderStatus" NOT NULL DEFAULT 'pending_review',
  "total_quantity" INTEGER NOT NULL,
  "total_execution_quantity" INTEGER NOT NULL,
  "total_cost" DECIMAL(15, 2) NOT NULL,
  "frozen_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  "settled_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  "note" TEXT,
  "comment_lines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allow_duplicate_comments" BOOLEAN NOT NULL DEFAULT true,
  "ytb_sync_status" VARCHAR(50),
  "ytb_last_sync_at" TIMESTAMPTZ,
  "ytb_last_error" TEXT,
  "approved_by_id" UUID,
  "approved_at" TIMESTAMPTZ,
  "rejection_reason" TEXT,
  "is_compensation" BOOLEAN NOT NULL DEFAULT false,
  "compensation_for_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "youtube_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "youtube_orders_client_id_service_type_status_created_at_idx" ON "youtube_orders"("client_id", "service_type", "status", "created_at");
CREATE INDEX "youtube_orders_status_created_at_idx" ON "youtube_orders"("status", "created_at");

ALTER TABLE "youtube_orders" ADD CONSTRAINT "youtube_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "youtube_orders" ADD CONSTRAINT "youtube_orders_service_config_id_fkey" FOREIGN KEY ("service_config_id") REFERENCES "youtube_service_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "youtube_orders" ADD CONSTRAINT "youtube_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "youtube_orders" ADD CONSTRAINT "youtube_orders_compensation_for_id_fkey" FOREIGN KEY ("compensation_for_id") REFERENCES "youtube_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "youtube_order_targets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "service_type" "YoutubeServiceType" NOT NULL,
  "input" TEXT NOT NULL,
  "target_key" VARCHAR(255) NOT NULL,
  "target_url" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "execution_quantity" INTEGER NOT NULL,
  "delivered_quantity" INTEGER NOT NULL DEFAULT 0,
  "ytb_status" VARCHAR(50),
  "ytb_quota_done" INTEGER NOT NULL DEFAULT 0,
  "ytb_quota_total" INTEGER NOT NULL DEFAULT 0,
  "ytb_last_detail" JSONB,
  "ytb_last_error" TEXT,
  "enqueued_at" TIMESTAMPTZ,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "youtube_order_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "youtube_order_targets_order_id_target_key_key" ON "youtube_order_targets"("order_id", "target_key");
CREATE INDEX "youtube_order_targets_service_type_target_key_idx" ON "youtube_order_targets"("service_type", "target_key");
CREATE INDEX "youtube_order_targets_ytb_status_last_synced_at_idx" ON "youtube_order_targets"("ytb_status", "last_synced_at");

ALTER TABLE "youtube_order_targets" ADD CONSTRAINT "youtube_order_targets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "youtube_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "youtube_order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "actor_id" UUID,
  "type" VARCHAR(80) NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "youtube_order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "youtube_order_events_order_id_created_at_idx" ON "youtube_order_events"("order_id", "created_at");
CREATE INDEX "youtube_order_events_type_created_at_idx" ON "youtube_order_events"("type", "created_at");

ALTER TABLE "youtube_order_events" ADD CONSTRAINT "youtube_order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "youtube_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "youtube_order_events" ADD CONSTRAINT "youtube_order_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

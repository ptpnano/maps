CREATE UNIQUE INDEX IF NOT EXISTS "youtube_worker_action_histories_unique_success_gmail_target"
ON "youtube_worker_action_histories"("service_type", "target_key", "gmail")
WHERE "status" = 'success' AND "gmail" IS NOT NULL AND "gmail" <> '';

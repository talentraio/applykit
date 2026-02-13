-- Add score_alert_dismissed_at to generations table
-- This field tracks when the user dismissed the score notification alert
-- for a specific generation. When null, the alert should be shown.
ALTER TABLE "generations"
ADD COLUMN "score_alert_dismissed_at" timestamp;

-- Add index for efficient filtering
CREATE INDEX "idx_generations_score_alert_dismissed_at" ON "generations" ("score_alert_dismissed_at");

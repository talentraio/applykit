DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'llm_scenario_key' AND e.enumlabel = 'resume_adaptation_scoring'
  ) THEN
    ALTER TYPE llm_scenario_key ADD VALUE 'resume_adaptation_scoring';
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'usage_context' AND e.enumlabel = 'resume_adaptation_scoring'
  ) THEN
    ALTER TYPE usage_context ADD VALUE 'resume_adaptation_scoring';
  END IF;
END
$$;
--> statement-breakpoint
INSERT INTO "llm_scenarios" ("key", "label", "description", "enabled")
VALUES (
  'resume_adaptation_scoring',
  'Resume Adaptation Scoring',
  'Calculate match score before and after resume adaptation.',
  true
)
ON CONFLICT ("key")
DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "enabled" = EXCLUDED."enabled",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "llm_scenario_models" (
  "scenario_key",
  "model_id",
  "retry_model_id",
  "temperature",
  "max_tokens",
  "response_format",
  "updated_at"
)
SELECT
  'resume_adaptation_scoring'::llm_scenario_key,
  COALESCE(
    (
      SELECT "id"
      FROM "llm_models"
      WHERE "provider" = 'openai' AND "model_key" = 'gpt-4.1-mini' AND "status" = 'active'
      LIMIT 1
    ),
    (
      SELECT "id"
      FROM "llm_models"
      WHERE "status" = 'active'
      ORDER BY "created_at" ASC
      LIMIT 1
    )
  ),
  NULL,
  0.70::numeric(3, 2),
  2000,
  'json'::llm_response_format,
  now()
WHERE EXISTS (SELECT 1 FROM "llm_models" WHERE "status" = 'active')
ON CONFLICT ("scenario_key")
DO UPDATE SET
  "model_id" = EXCLUDED."model_id",
  "retry_model_id" = EXCLUDED."retry_model_id",
  "temperature" = EXCLUDED."temperature",
  "max_tokens" = EXCLUDED."max_tokens",
  "response_format" = EXCLUDED."response_format",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
UPDATE "usage_logs"
SET "provider_type" = 'platform'
WHERE "provider_type"::text = 'byok';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type_tmp') THEN
      CREATE TYPE "provider_type_tmp" AS ENUM ('platform');
    END IF;

    ALTER TABLE "usage_logs"
    ALTER COLUMN "provider_type"
    TYPE "provider_type_tmp"
    USING 'platform'::"provider_type_tmp";

    DROP TYPE "provider_type";
    ALTER TYPE "provider_type_tmp" RENAME TO "provider_type";
  END IF;
END
$$;

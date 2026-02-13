DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'llm_reasoning_effort'
  ) THEN
    CREATE TYPE "public"."llm_reasoning_effort" AS ENUM('auto', 'low', 'medium', 'high');
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "llm_scenario_models" ADD COLUMN IF NOT EXISTS "reasoning_effort" "llm_reasoning_effort";--> statement-breakpoint
ALTER TABLE "llm_role_scenario_overrides" ADD COLUMN IF NOT EXISTS "reasoning_effort" "llm_reasoning_effort";--> statement-breakpoint
UPDATE "llm_scenario_models"
SET "reasoning_effort" = 'auto'
WHERE "scenario_key" = 'resume_adaptation'
  AND "reasoning_effort" IS NULL;--> statement-breakpoint
UPDATE "llm_role_scenario_overrides"
SET "reasoning_effort" = 'auto'
WHERE "scenario_key" = 'resume_adaptation'
  AND "reasoning_effort" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_strategy_key') THEN
    CREATE TYPE "llm_strategy_key" AS ENUM ('economy', 'quality');
  END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "llm_scenario_models"
  ADD COLUMN IF NOT EXISTS "strategy_key" "llm_strategy_key";
--> statement-breakpoint
ALTER TABLE "llm_role_scenario_overrides"
  ADD COLUMN IF NOT EXISTS "strategy_key" "llm_strategy_key";
--> statement-breakpoint
UPDATE "llm_scenario_models"
SET "strategy_key" = 'economy'::"llm_strategy_key"
WHERE "strategy_key" IS NULL
  AND "scenario_key" IN ('resume_adaptation', 'resume_adaptation_scoring');
--> statement-breakpoint
UPDATE "llm_role_scenario_overrides"
SET "strategy_key" = 'economy'::"llm_strategy_key"
WHERE "strategy_key" IS NULL
  AND "scenario_key" IN ('resume_adaptation', 'resume_adaptation_scoring');
--> statement-breakpoint
ALTER TABLE "generations"
  ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;
--> statement-breakpoint
UPDATE "generations"
SET "score_breakdown" = jsonb_build_object(
  'version', 'legacy',
  'components', jsonb_build_object(
    'core', jsonb_build_object('before', "match_score_before", 'after', "match_score_after", 'weight', 0.35),
    'mustHave', jsonb_build_object('before', "match_score_before", 'after', "match_score_after", 'weight', 0.30),
    'niceToHave', jsonb_build_object('before', "match_score_before", 'after', "match_score_after", 'weight', 0.10),
    'responsibilities', jsonb_build_object('before', "match_score_before", 'after', "match_score_after", 'weight', 0.15),
    'human', jsonb_build_object('before', "match_score_before", 'after', "match_score_after", 'weight', 0.10)
  ),
  'gateStatus', jsonb_build_object(
    'schemaValid', true,
    'identityStable', true,
    'hallucinationFree', true
  )
)
WHERE "score_breakdown" IS NULL;
--> statement-breakpoint
ALTER TABLE "generations"
  ALTER COLUMN "score_breakdown" SET NOT NULL;

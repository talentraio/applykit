DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'llm_scenario_key' AND e.enumlabel = 'resume_adaptation_scoring_detail'
  ) THEN
    ALTER TYPE llm_scenario_key ADD VALUE 'resume_adaptation_scoring_detail';
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
    WHERE t.typname = 'usage_context' AND e.enumlabel = 'resume_adaptation_scoring_detail'
  ) THEN
    ALTER TYPE usage_context ADD VALUE 'resume_adaptation_scoring_detail';
  END IF;
END
$$;

ALTER TABLE "llm_scenario_models" ADD COLUMN IF NOT EXISTS "retry_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "llm_role_scenario_overrides" ADD COLUMN IF NOT EXISTS "retry_model_id" uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'llm_scenario_models_retry_model_id_llm_models_id_fk'
  ) THEN
    ALTER TABLE "llm_scenario_models"
    ADD CONSTRAINT "llm_scenario_models_retry_model_id_llm_models_id_fk"
    FOREIGN KEY ("retry_model_id")
    REFERENCES "public"."llm_models" ("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'llm_role_scenario_overrides_retry_model_id_llm_models_id_fk'
  ) THEN
    ALTER TABLE "llm_role_scenario_overrides"
    ADD CONSTRAINT "llm_role_scenario_overrides_retry_model_id_llm_models_id_fk"
    FOREIGN KEY ("retry_model_id")
    REFERENCES "public"."llm_models" ("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_scenario_models_retry_model_id" ON "llm_scenario_models" ("retry_model_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_role_scenario_overrides_retry_model_id" ON "llm_role_scenario_overrides" ("retry_model_id");

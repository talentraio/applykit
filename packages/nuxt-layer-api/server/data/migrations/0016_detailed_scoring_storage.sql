INSERT INTO "llm_scenarios" ("key", "label", "description", "enabled")
VALUES (
  'resume_adaptation_scoring_detail',
  'Resume Detailed Scoring',
  'Generate detailed on-demand scoring insights for tailored resume.',
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
  "strategy_key",
  "updated_at"
)
SELECT
  'resume_adaptation_scoring_detail'::llm_scenario_key,
  COALESCE(
    (
      SELECT "model_id"
      FROM "llm_scenario_models"
      WHERE "scenario_key" = 'resume_adaptation_scoring'
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
  0.00::numeric(3, 2),
  2000,
  'json'::llm_response_format,
  NULL,
  now()
WHERE EXISTS (SELECT 1 FROM "llm_models" WHERE "status" = 'active')
ON CONFLICT ("scenario_key")
DO UPDATE SET
  "model_id" = EXCLUDED."model_id",
  "retry_model_id" = EXCLUDED."retry_model_id",
  "temperature" = EXCLUDED."temperature",
  "max_tokens" = EXCLUDED."max_tokens",
  "response_format" = EXCLUDED."response_format",
  "strategy_key" = EXCLUDED."strategy_key",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generation_score_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "generation_id" uuid NOT NULL,
  "vacancy_id" uuid NOT NULL,
  "vacancy_version_marker" varchar(128) NOT NULL,
  "details" jsonb NOT NULL,
  "provider" llm_provider NOT NULL,
  "model" varchar(255) NOT NULL,
  "strategy_key" llm_strategy_key,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "generation_score_details_generation_id_unique" UNIQUE ("generation_id")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'generation_score_details_generation_id_generations_id_fk'
  ) THEN
    ALTER TABLE "generation_score_details"
    ADD CONSTRAINT "generation_score_details_generation_id_generations_id_fk"
    FOREIGN KEY ("generation_id")
    REFERENCES "public"."generations" ("id")
    ON DELETE cascade
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
    WHERE conname = 'generation_score_details_vacancy_id_vacancies_id_fk'
  ) THEN
    ALTER TABLE "generation_score_details"
    ADD CONSTRAINT "generation_score_details_vacancy_id_vacancies_id_fk"
    FOREIGN KEY ("vacancy_id")
    REFERENCES "public"."vacancies" ("id")
    ON DELETE cascade
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_score_details_vacancy_id" ON "generation_score_details" ("vacancy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_score_details_updated_at" ON "generation_score_details" ("updated_at");

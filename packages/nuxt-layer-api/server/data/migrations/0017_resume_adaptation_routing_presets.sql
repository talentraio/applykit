WITH recommended_models AS (
  SELECT
    COALESCE(
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "provider" = 'openai'
          AND "model_key" = 'gpt-4.1-mini'
          AND "status" = 'active'
        LIMIT 1
      ),
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "status" = 'active'
        ORDER BY "created_at" ASC
        LIMIT 1
      )
    ) AS economy_model_id,
    COALESCE(
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "provider" = 'openai'
          AND "model_key" = 'gpt-5-mini'
          AND "status" = 'active'
        LIMIT 1
      ),
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "provider" = 'openai'
          AND "model_key" = 'gpt-4.1-mini'
          AND "status" = 'active'
        LIMIT 1
      ),
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "status" = 'active'
        ORDER BY "created_at" ASC
        LIMIT 1
      )
    ) AS quality_model_id
)
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
  defaults."scenario_key",
  defaults."model_id",
  defaults."retry_model_id",
  defaults."temperature",
  defaults."max_tokens",
  defaults."response_format",
  defaults."strategy_key",
  now()
FROM (
  SELECT
    'resume_adaptation'::llm_scenario_key AS "scenario_key",
    recommended_models.economy_model_id AS "model_id",
    recommended_models.economy_model_id AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    'economy'::llm_strategy_key AS "strategy_key"
  FROM recommended_models

  UNION ALL

  SELECT
    'resume_adaptation_scoring'::llm_scenario_key AS "scenario_key",
    recommended_models.economy_model_id AS "model_id",
    NULL::uuid AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    NULL::llm_strategy_key AS "strategy_key"
  FROM recommended_models

  UNION ALL

  SELECT
    'resume_adaptation_scoring_detail'::llm_scenario_key AS "scenario_key",
    recommended_models.economy_model_id AS "model_id",
    recommended_models.economy_model_id AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    NULL::llm_strategy_key AS "strategy_key"
  FROM recommended_models
) AS defaults
WHERE defaults."model_id" IS NOT NULL
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
WITH recommended_models AS (
  SELECT
    COALESCE(
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "provider" = 'openai'
          AND "model_key" = 'gpt-5-mini'
          AND "status" = 'active'
        LIMIT 1
      ),
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "provider" = 'openai'
          AND "model_key" = 'gpt-4.1-mini'
          AND "status" = 'active'
        LIMIT 1
      ),
      (
        SELECT "id"
        FROM "llm_models"
        WHERE "status" = 'active'
        ORDER BY "created_at" ASC
        LIMIT 1
      )
    ) AS quality_model_id
),
target_roles AS (
  SELECT 'friend'::role AS "role"
  UNION ALL
  SELECT 'super_admin'::role AS "role"
)
INSERT INTO "llm_role_scenario_overrides" (
  "role",
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
  payload."role",
  payload."scenario_key",
  payload."model_id",
  payload."retry_model_id",
  payload."temperature",
  payload."max_tokens",
  payload."response_format",
  payload."strategy_key",
  now()
FROM (
  SELECT
    target_roles."role",
    'resume_adaptation'::llm_scenario_key AS "scenario_key",
    recommended_models.quality_model_id AS "model_id",
    recommended_models.quality_model_id AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    'quality'::llm_strategy_key AS "strategy_key"
  FROM target_roles
  CROSS JOIN recommended_models

  UNION ALL

  SELECT
    target_roles."role",
    'resume_adaptation_scoring'::llm_scenario_key AS "scenario_key",
    recommended_models.quality_model_id AS "model_id",
    NULL::uuid AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    NULL::llm_strategy_key AS "strategy_key"
  FROM target_roles
  CROSS JOIN recommended_models

  UNION ALL

  SELECT
    target_roles."role",
    'resume_adaptation_scoring_detail'::llm_scenario_key AS "scenario_key",
    recommended_models.quality_model_id AS "model_id",
    recommended_models.quality_model_id AS "retry_model_id",
    NULL::numeric(3, 2) AS "temperature",
    NULL::integer AS "max_tokens",
    NULL::llm_response_format AS "response_format",
    NULL::llm_strategy_key AS "strategy_key"
  FROM target_roles
  CROSS JOIN recommended_models
) AS payload
WHERE payload."model_id" IS NOT NULL
ON CONFLICT ("role", "scenario_key")
DO UPDATE SET
  "model_id" = EXCLUDED."model_id",
  "retry_model_id" = EXCLUDED."retry_model_id",
  "temperature" = EXCLUDED."temperature",
  "max_tokens" = EXCLUDED."max_tokens",
  "response_format" = EXCLUDED."response_format",
  "strategy_key" = EXCLUDED."strategy_key",
  "updated_at" = EXCLUDED."updated_at";

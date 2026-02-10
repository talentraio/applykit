DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_model_status') THEN
    CREATE TYPE llm_model_status AS ENUM ('active', 'disabled', 'archived');
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_scenario_key') THEN
    CREATE TYPE llm_scenario_key AS ENUM (
      'resume_parse',
      'resume_adaptation',
      'cover_letter_generation'
    );
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_response_format') THEN
    CREATE TYPE llm_response_format AS ENUM ('text', 'json');
  END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" llm_provider NOT NULL,
  "model_key" varchar(255) NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "status" llm_model_status DEFAULT 'active' NOT NULL,
  "input_price_per_1m_usd" numeric(10, 6) NOT NULL,
  "output_price_per_1m_usd" numeric(10, 6) NOT NULL,
  "cached_input_price_per_1m_usd" numeric(10, 6),
  "max_context_tokens" integer,
  "max_output_tokens" integer,
  "supports_json" boolean DEFAULT false NOT NULL,
  "supports_tools" boolean DEFAULT false NOT NULL,
  "supports_streaming" boolean DEFAULT false NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "llm_models_provider_model_key_unique" UNIQUE ("provider", "model_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_models_status" ON "llm_models" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_models_provider_status" ON "llm_models" ("provider", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_scenarios" (
  "key" llm_scenario_key PRIMARY KEY NOT NULL,
  "label" varchar(255) NOT NULL,
  "description" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_scenario_models" (
  "scenario_key" llm_scenario_key PRIMARY KEY NOT NULL,
  "model_id" uuid NOT NULL,
  "temperature" numeric(3, 2),
  "max_tokens" integer,
  "response_format" llm_response_format,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'llm_scenario_models_scenario_key_llm_scenarios_key_fk'
  ) THEN
    ALTER TABLE "llm_scenario_models"
    ADD CONSTRAINT "llm_scenario_models_scenario_key_llm_scenarios_key_fk"
    FOREIGN KEY ("scenario_key")
    REFERENCES "public"."llm_scenarios" ("key")
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
    WHERE conname = 'llm_scenario_models_model_id_llm_models_id_fk'
  ) THEN
    ALTER TABLE "llm_scenario_models"
    ADD CONSTRAINT "llm_scenario_models_model_id_llm_models_id_fk"
    FOREIGN KEY ("model_id")
    REFERENCES "public"."llm_models" ("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_scenario_models_model_id" ON "llm_scenario_models" ("model_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_role_scenario_overrides" (
  "role" role NOT NULL,
  "scenario_key" llm_scenario_key NOT NULL,
  "model_id" uuid NOT NULL,
  "temperature" numeric(3, 2),
  "max_tokens" integer,
  "response_format" llm_response_format,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "llm_role_scenario_overrides_role_scenario_unique" UNIQUE ("role", "scenario_key")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'llm_role_scenario_overrides_scenario_key_llm_scenarios_key_fk'
  ) THEN
    ALTER TABLE "llm_role_scenario_overrides"
    ADD CONSTRAINT "llm_role_scenario_overrides_scenario_key_llm_scenarios_key_fk"
    FOREIGN KEY ("scenario_key")
    REFERENCES "public"."llm_scenarios" ("key")
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
    WHERE conname = 'llm_role_scenario_overrides_model_id_llm_models_id_fk'
  ) THEN
    ALTER TABLE "llm_role_scenario_overrides"
    ADD CONSTRAINT "llm_role_scenario_overrides_model_id_llm_models_id_fk"
    FOREIGN KEY ("model_id")
    REFERENCES "public"."llm_models" ("id")
    ON DELETE no action
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_role_scenario_overrides_scenario_key" ON "llm_role_scenario_overrides" ("scenario_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_role_scenario_overrides_model_id" ON "llm_role_scenario_overrides" ("model_id");
--> statement-breakpoint
ALTER TABLE "role_settings" DROP COLUMN IF EXISTS "byok_enabled";
--> statement-breakpoint
DROP TABLE IF EXISTS "llm_keys";
--> statement-breakpoint
DELETE FROM "system_configs" WHERE "key" = 'byok_enabled';
--> statement-breakpoint
INSERT INTO "llm_scenarios" ("key", "label", "description", "enabled")
VALUES
  (
    'resume_parse',
    'Resume Parse',
    'Parse uploaded resume into strict structured JSON.',
    true
  ),
  (
    'resume_adaptation',
    'Resume Adaptation',
    'Generate tailored resume version for selected vacancy.',
    true
  ),
  (
    'cover_letter_generation',
    'Cover Letter Generation',
    'Generate tailored cover letter for selected vacancy.',
    true
  )
ON CONFLICT ("key")
DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "enabled" = EXCLUDED."enabled",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "llm_models" (
  "provider",
  "model_key",
  "display_name",
  "status",
  "input_price_per_1m_usd",
  "output_price_per_1m_usd",
  "cached_input_price_per_1m_usd",
  "max_context_tokens",
  "max_output_tokens",
  "supports_json",
  "supports_tools",
  "supports_streaming",
  "notes"
)
VALUES
  (
    'openai',
    'gpt-4.1-mini',
    'OpenAI GPT-4.1 Mini',
    'active',
    0.40,
    1.60,
    NULL,
    NULL,
    NULL,
    true,
    true,
    true,
    'Default OpenAI baseline model'
  ),
  (
    'gemini',
    'gemini-2.0-flash',
    'Google Gemini 2.0 Flash',
    'active',
    0.10,
    0.40,
    NULL,
    NULL,
    NULL,
    true,
    true,
    true,
    'Default Gemini baseline model'
  )
ON CONFLICT ("provider", "model_key")
DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "status" = EXCLUDED."status",
  "input_price_per_1m_usd" = EXCLUDED."input_price_per_1m_usd",
  "output_price_per_1m_usd" = EXCLUDED."output_price_per_1m_usd",
  "supports_json" = EXCLUDED."supports_json",
  "supports_tools" = EXCLUDED."supports_tools",
  "supports_streaming" = EXCLUDED."supports_streaming",
  "notes" = EXCLUDED."notes",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "llm_scenario_models" ("scenario_key", "model_id", "temperature", "max_tokens", "response_format", "updated_at")
SELECT
  scenario_key,
  model_id,
  temperature,
  max_tokens,
  response_format,
  now()
FROM (
  VALUES
    ('resume_parse'::llm_scenario_key, (SELECT "id" FROM "llm_models" WHERE "provider" = 'openai' AND "model_key" = 'gpt-4.1-mini' LIMIT 1), 0.10::numeric(3, 2), 4000, 'json'::llm_response_format),
    ('resume_adaptation'::llm_scenario_key, (SELECT "id" FROM "llm_models" WHERE "provider" = 'openai' AND "model_key" = 'gpt-4.1-mini' LIMIT 1), 0.30::numeric(3, 2), 6000, 'json'::llm_response_format),
    ('cover_letter_generation'::llm_scenario_key, (SELECT "id" FROM "llm_models" WHERE "provider" = 'openai' AND "model_key" = 'gpt-4.1-mini' LIMIT 1), 0.40::numeric(3, 2), 4000, 'text'::llm_response_format)
) AS defaults("scenario_key", "model_id", "temperature", "max_tokens", "response_format")
WHERE model_id IS NOT NULL
ON CONFLICT ("scenario_key")
DO UPDATE SET
  "model_id" = EXCLUDED."model_id",
  "temperature" = EXCLUDED."temperature",
  "max_tokens" = EXCLUDED."max_tokens",
  "response_format" = EXCLUDED."response_format",
  "updated_at" = now();

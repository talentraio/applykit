DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_language'
  ) THEN
    CREATE TYPE "public"."cover_letter_language" AS ENUM('en', 'da');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_type'
  ) THEN
    CREATE TYPE "public"."cover_letter_type" AS ENUM('letter', 'message');
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_tone'
  ) THEN
    CREATE TYPE "public"."cover_letter_tone" AS ENUM(
      'professional',
      'friendly',
      'enthusiastic',
      'direct'
    );
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_length_preset'
  ) THEN
    CREATE TYPE "public"."cover_letter_length_preset" AS ENUM('short', 'standard', 'long');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cover_letters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "vacancy_id" uuid NOT NULL,
  "generation_id" uuid NOT NULL,
  "language" "cover_letter_language" DEFAULT 'en' NOT NULL,
  "type" "cover_letter_type" DEFAULT 'letter' NOT NULL,
  "tone" "cover_letter_tone" DEFAULT 'professional' NOT NULL,
  "length_preset" "cover_letter_length_preset" DEFAULT 'standard' NOT NULL,
  "recipient_name" varchar(120),
  "include_subject_line" boolean DEFAULT false NOT NULL,
  "instructions" text,
  "subject_line" varchar(180),
  "content_markdown" text NOT NULL,
  "format_settings" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "cover_letters_vacancy_id_unique" UNIQUE("vacancy_id")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cover_letters_vacancy_id_vacancies_id_fk'
  ) THEN
    ALTER TABLE "cover_letters"
    ADD CONSTRAINT "cover_letters_vacancy_id_vacancies_id_fk"
    FOREIGN KEY ("vacancy_id")
    REFERENCES "public"."vacancies"("id")
    ON DELETE cascade
    ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cover_letters_generation_id_generations_id_fk'
  ) THEN
    ALTER TABLE "cover_letters"
    ADD CONSTRAINT "cover_letters_generation_id_generations_id_fk"
    FOREIGN KEY ("generation_id")
    REFERENCES "public"."generations"("id")
    ON DELETE cascade
    ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cover_letters_vacancy_id" ON "cover_letters" USING btree ("vacancy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cover_letters_generation_id" ON "cover_letters" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cover_letters_updated_at" ON "cover_letters" USING btree ("updated_at");--> statement-breakpoint

UPDATE "llm_scenario_models"
SET "response_format" = 'json'
WHERE "scenario_key" = 'cover_letter_generation';--> statement-breakpoint
UPDATE "llm_role_scenario_overrides"
SET "response_format" = 'json'
WHERE "scenario_key" = 'cover_letter_generation';

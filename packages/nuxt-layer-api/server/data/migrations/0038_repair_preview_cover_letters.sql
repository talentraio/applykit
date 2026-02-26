-- Repair migration: ensure all cover_letters columns/types from 0030-0037 exist.
--
-- Root cause: preview.yml uses cancel-in-progress which can kill deploys
-- mid-migration, leaving drizzle journal entries that mark migrations as
-- "applied" even though their SQL never fully executed.
-- Every statement below is idempotent (IF NOT EXISTS / DO blocks).

-- From 0030: enum values for cover_letter_length_preset
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cover_letter_length_preset')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'cover_letter_length_preset' AND e.enumlabel = 'min_chars'
     ) THEN
    ALTER TYPE "public"."cover_letter_length_preset" ADD VALUE 'min_chars';
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cover_letter_length_preset')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'cover_letter_length_preset' AND e.enumlabel = 'max_chars'
     ) THEN
    ALTER TYPE "public"."cover_letter_length_preset" ADD VALUE 'max_chars';
  END IF;
END
$$;--> statement-breakpoint

-- From 0030: character_limit column
ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "character_limit" integer;--> statement-breakpoint

-- From 0033: grammatical_gender type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grammatical_gender') THEN
    CREATE TYPE "public"."grammatical_gender" AS ENUM('masculine', 'feminine', 'neutral');
  END IF;
END
$$;--> statement-breakpoint

-- From 0033: grammatical_gender on profiles
ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "grammatical_gender" "grammatical_gender" DEFAULT 'neutral' NOT NULL;--> statement-breakpoint

-- From 0034: grammatical_gender on cover_letters
ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "grammatical_gender" "grammatical_gender" DEFAULT 'neutral' NOT NULL;--> statement-breakpoint

-- From 0035: cover_letter_market type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cover_letter_market') THEN
    CREATE TYPE "public"."cover_letter_market" AS ENUM('default', 'dk', 'ua');
  END IF;
END
$$;--> statement-breakpoint

-- From 0035: market column
ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "market" "cover_letter_market" DEFAULT 'default' NOT NULL;--> statement-breakpoint

-- From 0036: llm_scenario_key values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_scenario_key')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'llm_scenario_key' AND e.enumlabel = 'cover_letter_generation_draft'
     ) THEN
    ALTER TYPE "public"."llm_scenario_key" ADD VALUE 'cover_letter_generation_draft';
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'llm_scenario_key')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'llm_scenario_key' AND e.enumlabel = 'cover_letter_humanizer_critic'
     ) THEN
    ALTER TYPE "public"."llm_scenario_key" ADD VALUE 'cover_letter_humanizer_critic';
  END IF;
END
$$;--> statement-breakpoint

-- From 0037: cover_letter_quality_mode type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cover_letter_quality_mode') THEN
    CREATE TYPE "public"."cover_letter_quality_mode" AS ENUM('draft', 'high');
  END IF;
END
$$;--> statement-breakpoint

-- From 0037: quality_mode column
ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "quality_mode" "cover_letter_quality_mode" DEFAULT 'high' NOT NULL;

DO $$ BEGIN
  CREATE TYPE "public"."vacancy_status" AS ENUM('created', 'generated', 'screening', 'rejected', 'interview', 'offer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_format_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ats" jsonb NOT NULL,
	"human" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_format_settings_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vacancies" ADD COLUMN "status" "vacancy_status" DEFAULT 'created' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_format_settings" ADD CONSTRAINT "user_format_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
-- Data migration: copy settings from resumes (most recently updated per user)
INSERT INTO "user_format_settings" ("user_id", "ats", "human")
SELECT DISTINCT ON (r."user_id")
  r."user_id",
  jsonb_build_object(
    'spacing', COALESCE(r."ats_settings", '{"marginX":20,"marginY":15,"fontSize":12,"lineHeight":1.2,"blockSpacing":5}'::jsonb),
    'localization', '{"language":"en-US","dateFormat":"MMM yyyy","pageFormat":"A4"}'::jsonb
  ),
  jsonb_build_object(
    'spacing', COALESCE(r."human_settings", '{"marginX":20,"marginY":15,"fontSize":12,"lineHeight":1.2,"blockSpacing":5}'::jsonb),
    'localization', '{"language":"en-US","dateFormat":"MMM yyyy","pageFormat":"A4"}'::jsonb
  )
FROM "resumes" r
WHERE NOT EXISTS (
  SELECT 1 FROM "user_format_settings" ufs WHERE ufs."user_id" = r."user_id"
)
ORDER BY r."user_id", r."updated_at" DESC;--> statement-breakpoint
-- Seed defaults for users without settings (no resumes or null settings)
INSERT INTO "user_format_settings" ("user_id", "ats", "human")
SELECT u."id",
  '{"spacing":{"marginX":20,"marginY":15,"fontSize":12,"lineHeight":1.2,"blockSpacing":5},"localization":{"language":"en-US","dateFormat":"MMM yyyy","pageFormat":"A4"}}'::jsonb,
  '{"spacing":{"marginX":20,"marginY":15,"fontSize":12,"lineHeight":1.2,"blockSpacing":5},"localization":{"language":"en-US","dateFormat":"MMM yyyy","pageFormat":"A4"}}'::jsonb
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "user_format_settings" ufs WHERE ufs."user_id" = u."id"
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "resumes" DROP COLUMN IF EXISTS "ats_settings";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "resumes" DROP COLUMN IF EXISTS "human_settings";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

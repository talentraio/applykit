-- No-op: vacancy_status and vacancies.status already handled by 005_add_vacancy_status and 0005_special_psylocke
-- This migration was auto-generated as a duplicate. All changes already applied.
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
DO $$ BEGIN
  ALTER TABLE "resumes" DROP COLUMN IF EXISTS "ats_settings";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "resumes" DROP COLUMN IF EXISTS "human_settings";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

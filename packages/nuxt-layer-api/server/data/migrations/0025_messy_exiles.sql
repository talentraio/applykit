-- Feature 014: Multiple Base Resumes
-- DDL: create resume_format_settings, add name to resumes, add default_resume_id to users

CREATE TABLE "resume_format_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"ats" jsonb NOT NULL,
	"human" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resume_format_settings_resume_id_unique" UNIQUE("resume_id")
);
--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "name" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_resume_id" uuid;--> statement-breakpoint
ALTER TABLE "resume_format_settings" ADD CONSTRAINT "resume_format_settings_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_resume_format_settings_resume_id" ON "resume_format_settings" USING btree ("resume_id");--> statement-breakpoint

-- Data migration: backfill resume name from created_at date
UPDATE "resumes" SET "name" = TO_CHAR("created_at", 'DD.MM.YYYY') WHERE "name" = '';--> statement-breakpoint

-- Data migration: set default_resume_id to most recent resume per user
UPDATE "users" u SET "default_resume_id" = (
  SELECT r."id" FROM "resumes" r
  WHERE r."user_id" = u."id"
  ORDER BY r."created_at" DESC
  LIMIT 1
) WHERE u."default_resume_id" IS NULL;--> statement-breakpoint

-- Data migration: copy user_format_settings to resume_format_settings (one per resume)
INSERT INTO "resume_format_settings" ("resume_id", "ats", "human")
SELECT r."id", ufs."ats", ufs."human"
FROM "resumes" r
JOIN "user_format_settings" ufs ON ufs."user_id" = r."user_id"
ON CONFLICT ("resume_id") DO NOTHING;
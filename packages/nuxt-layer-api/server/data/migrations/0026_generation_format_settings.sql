-- Feature: Generation-specific format settings
-- DDL: create generation_format_settings as a settings snapshot per generation

CREATE TABLE "generation_format_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"ats" jsonb NOT NULL,
	"human" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "generation_format_settings_generation_id_unique" UNIQUE("generation_id")
);
--> statement-breakpoint
ALTER TABLE "generation_format_settings" ADD CONSTRAINT "generation_format_settings_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generation_format_settings_generation_id" ON "generation_format_settings" USING btree ("generation_id");--> statement-breakpoint

-- Data migration: clone resume-level settings for existing generations
INSERT INTO "generation_format_settings" ("generation_id", "ats", "human")
SELECT g."id", rfs."ats", rfs."human"
FROM "generations" g
JOIN "resume_format_settings" rfs ON rfs."resume_id" = g."resume_id"
ON CONFLICT ("generation_id") DO NOTHING;

ALTER TYPE "public"."cover_letter_length_preset" ADD VALUE IF NOT EXISTS 'min_chars';--> statement-breakpoint
ALTER TYPE "public"."cover_letter_length_preset" ADD VALUE IF NOT EXISTS 'max_chars';--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN IF NOT EXISTS "character_limit" integer;

ALTER TABLE "cover_letters" DROP CONSTRAINT IF EXISTS "cover_letters_vacancy_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "cover_letters_vacancy_id_unique";--> statement-breakpoint

ALTER TABLE "generation_score_details" DROP CONSTRAINT IF EXISTS "generation_score_details_generation_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "generation_score_details_generation_id_unique";

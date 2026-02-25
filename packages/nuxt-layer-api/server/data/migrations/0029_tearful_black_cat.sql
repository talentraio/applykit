ALTER TABLE "cover_letters" DROP CONSTRAINT IF EXISTS "cover_letters_vacancy_id_unique";--> statement-breakpoint
ALTER TABLE "generation_score_details" DROP CONSTRAINT IF EXISTS "generation_score_details_generation_id_unique";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cover_letters_vacancy_created_at" ON "cover_letters" USING btree ("vacancy_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_score_details_generation_id" ON "generation_score_details" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_score_details_vacancy_generation_created_at" ON "generation_score_details" USING btree ("vacancy_id","generation_id","created_at");

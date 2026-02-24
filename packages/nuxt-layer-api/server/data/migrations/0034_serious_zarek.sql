ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "grammatical_gender" "grammatical_gender" DEFAULT 'neutral' NOT NULL;

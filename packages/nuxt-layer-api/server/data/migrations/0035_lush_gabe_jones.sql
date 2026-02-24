DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_market'
  ) THEN
    CREATE TYPE "public"."cover_letter_market" AS ENUM('default', 'dk', 'ua');
  END IF;
END
$$;--> statement-breakpoint

ALTER TABLE "cover_letters"
ADD COLUMN IF NOT EXISTS "market" "cover_letter_market" DEFAULT 'default' NOT NULL;--> statement-breakpoint

UPDATE "cover_letters"
SET "market" = CASE
  WHEN "language" = 'da-DK' THEN 'dk'::"cover_letter_market"
  WHEN "language" = 'uk-UA' THEN 'ua'::"cover_letter_market"
  ELSE 'default'::"cover_letter_market"
END
WHERE "market" IS NULL
   OR "market" = 'default'::"cover_letter_market";

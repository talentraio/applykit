DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'grammatical_gender'
  ) THEN
    CREATE TYPE "public"."grammatical_gender" AS ENUM('masculine', 'feminine', 'neutral');
  END IF;
END
$$;--> statement-breakpoint

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "grammatical_gender" "grammatical_gender" DEFAULT 'neutral' NOT NULL;

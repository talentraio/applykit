DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_language'
  ) AND EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cover_letter_language'
      AND e.enumlabel = 'da'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cover_letter_language'
      AND e.enumlabel = 'da-DK'
  ) THEN
    ALTER TYPE "public"."cover_letter_language" RENAME VALUE 'da' TO 'da-DK';
  END IF;
END $$;

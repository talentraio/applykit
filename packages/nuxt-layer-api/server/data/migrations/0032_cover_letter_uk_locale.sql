DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cover_letter_language'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cover_letter_language'
      AND e.enumlabel = 'uk-UA'
  ) THEN
    ALTER TYPE "public"."cover_letter_language" ADD VALUE 'uk-UA';
  END IF;
END $$;

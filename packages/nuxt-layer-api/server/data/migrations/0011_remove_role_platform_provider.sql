ALTER TABLE "role_settings" DROP COLUMN IF EXISTS "platform_provider";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'platform_provider'
  ) THEN
    DROP TYPE "platform_provider";
  END IF;
END
$$;

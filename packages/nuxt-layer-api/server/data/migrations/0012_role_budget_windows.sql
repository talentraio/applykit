ALTER TABLE "role_settings" ADD COLUMN IF NOT EXISTS "weekly_budget_cap" numeric(10, 2) NOT NULL DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "role_settings" ADD COLUMN IF NOT EXISTS "monthly_budget_cap" numeric(10, 2) NOT NULL DEFAULT '0';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'budget_period'
  ) THEN
    CREATE TYPE "budget_period" AS ENUM ('weekly', 'monthly');
  END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_budget_windows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "role" NOT NULL,
  "period" "budget_period" NOT NULL,
  "window_start_at" timestamp NOT NULL,
  "next_reset_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unique_role_budget_windows_user_role_period" UNIQUE("user_id", "role", "period")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'role_budget_windows_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "role_budget_windows"
    ADD CONSTRAINT "role_budget_windows_user_id_users_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."users" ("id")
    ON DELETE cascade
    ON UPDATE no action;
  END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_role_budget_windows_user_id" ON "role_budget_windows" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_role_budget_windows_next_reset_at" ON "role_budget_windows" ("next_reset_at");

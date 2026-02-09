DO $$ BEGIN
  ALTER TABLE "vacancies" ADD COLUMN "can_generate_resume" boolean DEFAULT true NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

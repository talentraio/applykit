CREATE TABLE IF NOT EXISTS "llm_role_scenario_enabled_overrides" (
	"role" "role" NOT NULL,
	"scenario_key" "llm_scenario_key" NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_role_scenario_enabled_overrides_role_scenario_unique" UNIQUE("role","scenario_key")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_role_scenario_enabled_overrides" ADD CONSTRAINT "llm_role_scenario_enabled_overrides_scenario_key_llm_scenarios_key_fk" FOREIGN KEY ("scenario_key") REFERENCES "public"."llm_scenarios"("key") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_role_scenario_enabled_overrides_scenario_key" ON "llm_role_scenario_enabled_overrides" USING btree ("scenario_key");

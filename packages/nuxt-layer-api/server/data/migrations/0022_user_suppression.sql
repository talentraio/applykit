-- Anti-abuse: suppression table for GDPR-compliant account deletion
CREATE TYPE "public"."suppression_reason" AS ENUM('account_deleted', 'abuse', 'chargeback');

CREATE TABLE IF NOT EXISTS "user_suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hmac" varchar(128) NOT NULL,
	"reason" "suppression_reason" DEFAULT 'account_deleted' NOT NULL,
	"source_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "user_suppression_email_hmac_unique" UNIQUE("email_hmac")
);

CREATE INDEX IF NOT EXISTS "idx_user_suppression_email_hmac" ON "user_suppression" USING btree ("email_hmac");
CREATE INDEX IF NOT EXISTS "idx_user_suppression_expires_at" ON "user_suppression" USING btree ("expires_at");

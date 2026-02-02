-- Migration 004: Auth columns + profile photo
-- Date: 2026-02-02
-- Adds missing user auth fields and profile photo URL for Postgres-only schema.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

ALTER TABLE users
  ALTER COLUMN google_id DROP NOT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS photo_url VARCHAR(2048);

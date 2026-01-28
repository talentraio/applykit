-- Migration 002: Admin roles + users enhancements
-- Date: 2026-01-28
-- Adds role settings, user status/login tracking, usage context, and cleans system config

-- ============================================================================
-- Enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('invited', 'active', 'blocked', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE usage_context AS ENUM ('resume_base', 'resume_adaptation', 'export');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE platform_provider AS ENUM ('openai', 'gemini_flash');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Users table updates
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Backfill status + last_login_at
UPDATE users
SET status = 'active'
WHERE status IS NULL;

UPDATE users
SET last_login_at = updated_at
WHERE last_login_at IS NULL;

-- ============================================================================
-- Role settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_settings (
  role role PRIMARY KEY,
  platform_llm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  byok_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  platform_provider platform_provider NOT NULL,
  daily_budget_cap NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed defaults for existing roles
INSERT INTO role_settings (role, platform_llm_enabled, byok_enabled, platform_provider, daily_budget_cap)
VALUES
  ('super_admin', TRUE, TRUE, 'openai', 0),
  ('friend', FALSE, FALSE, 'openai', 0),
  ('public', FALSE, FALSE, 'openai', 0)
ON CONFLICT (role) DO NOTHING;

-- ============================================================================
-- Usage logs updates
-- ============================================================================

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS usage_context usage_context;

-- ============================================================================
-- System config cleanup
-- ============================================================================

DELETE FROM system_configs
WHERE key IN ('platform_llm_enabled', 'byok_enabled', 'platform_provider');

-- Migration 001: Initial Schema
-- Foundation MVP - Complete database structure
-- Date: 2026-01-22
--
-- This migration creates all tables, enums, indexes, and initial data
-- for the resume tailoring application.

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE role AS ENUM ('super_admin', 'friend', 'public');
CREATE TYPE work_format AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE source_file_type AS ENUM ('docx', 'pdf');
CREATE TYPE llm_provider AS ENUM ('openai', 'gemini');
CREATE TYPE operation AS ENUM ('parse', 'generate', 'export');
CREATE TYPE provider_type AS ENUM ('platform', 'byok');

-- ============================================================================
-- Tables
-- ============================================================================

-- Users
-- Primary identity for authenticated users via Google OAuth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  role role NOT NULL DEFAULT 'public',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Profiles
-- User profile with contact info and job preferences
-- One-to-one relationship with users
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  search_region VARCHAR(100) NOT NULL,
  work_format work_format NOT NULL,
  languages JSONB NOT NULL,
  phones JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Resumes
-- Base resume uploaded by user (DOCX/PDF parsed to JSON)
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  source_file_name VARCHAR(255) NOT NULL,
  source_file_type source_file_type NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);

-- Vacancies
-- Job vacancies created by user for tailoring resumes
CREATE TABLE vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  job_position VARCHAR(255),
  description TEXT NOT NULL,
  url VARCHAR(2048),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vacancies_user_id ON vacancies(user_id);
CREATE INDEX idx_vacancies_created_at ON vacancies(created_at);

-- Generations
-- Tailored resume versions generated for specific vacancies
-- Expires after 90 days
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  match_score_before INTEGER NOT NULL,
  match_score_after INTEGER NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_generations_vacancy_id ON generations(vacancy_id);
CREATE INDEX idx_generations_resume_id ON generations(resume_id);
CREATE INDEX idx_generations_generated_at ON generations(generated_at);
CREATE INDEX idx_generations_expires_at ON generations(expires_at);

-- LLM Keys
-- Metadata for user's BYOK (Bring Your Own Key) API keys
-- CRITICAL SECURITY: Only stores last 4 characters as hint
-- Full keys are stored in browser localStorage only
CREATE TABLE llm_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  key_hint VARCHAR(4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
CREATE INDEX idx_llm_keys_user_id ON llm_keys(user_id);

-- Usage Logs
-- Tracks all operations for rate limiting, billing, and analytics
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation operation NOT NULL,
  provider_type provider_type NOT NULL,
  tokens_used INTEGER,
  cost DECIMAL(10, 6),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_operation_date ON usage_logs(user_id, operation, created_at);

-- System Config
-- Key-value store for system-wide configuration
-- Values stored as JSONB for type flexibility
CREATE TABLE system_configs (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Initialize system configuration with default values
INSERT INTO system_configs (key, value) VALUES
  ('platform_llm_enabled', 'true'),
  ('byok_enabled', 'true'),
  ('platform_provider', '"openai"'),
  ('global_budget_cap', '100'),
  ('global_budget_used', '0');

-- ============================================================================
-- Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'Authenticated users via Google OAuth';
COMMENT ON TABLE profiles IS 'User profile with contact info and job search preferences';
COMMENT ON TABLE resumes IS 'Base resumes uploaded by users (parsed from DOCX/PDF)';
COMMENT ON TABLE vacancies IS 'Job vacancies for which users want to tailor resumes';
COMMENT ON TABLE generations IS 'Tailored resume versions (expire after 90 days)';
COMMENT ON TABLE llm_keys IS 'BYOK metadata - stores only last 4 chars as hint for security';
COMMENT ON TABLE usage_logs IS 'Operation tracking for limits, billing, and analytics';
COMMENT ON TABLE system_configs IS 'System-wide configuration key-value store';

COMMENT ON COLUMN llm_keys.key_hint IS 'Last 4 characters only - full key in browser localStorage';
COMMENT ON COLUMN generations.expires_at IS 'Generation expires 90 days after creation';
COMMENT ON COLUMN usage_logs.cost IS 'Cost in USD (DECIMAL 10,6 for precision)';

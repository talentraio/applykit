-- Migration 005: Vacancy status
-- Date: 2026-02-04
-- Adds application-tracking status column to vacancies table.
-- Keep enum values in sync with @int/schema VACANCY_STATUS_VALUES.

CREATE TYPE vacancy_status AS ENUM ('created', 'generated', 'screening', 'rejected', 'interview', 'offer');

ALTER TABLE vacancies
  ADD COLUMN status vacancy_status NOT NULL DEFAULT 'created';

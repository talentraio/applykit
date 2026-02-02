-- Add formatting settings columns to resumes table
ALTER TABLE resumes ADD COLUMN ats_settings jsonb;
ALTER TABLE resumes ADD COLUMN human_settings jsonb;

-- Create resume_versions table for version history
CREATE TABLE resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  version_number integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resume_id, version_number)
);

-- Create index for efficient lookups
CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);

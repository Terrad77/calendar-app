-- Add user job title (editable project/role label, e.g. "Frontend Developer")
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;

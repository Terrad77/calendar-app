ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "theme" text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "preferred_country" text;
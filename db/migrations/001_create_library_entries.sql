CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS library_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_mode TEXT NOT NULL CHECK (analysis_mode IN ('site', 'section')),
  site_name TEXT,
  url TEXT,
  industry TEXT,
  score NUMERIC(4, 2),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS library_entries_created_at_idx
  ON library_entries (created_at DESC);

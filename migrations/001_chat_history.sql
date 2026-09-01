-- Migration 001: Chat History
-- Run once in Supabase Dashboard ? SQL Editor

CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url   TEXT,
  title      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role                     TEXT NOT NULL,
  content                  TEXT NOT NULL,
  mode                     TEXT,
  citations                JSONB,
  confidence_summary       TEXT,
  is_insufficient_evidence BOOLEAN DEFAULT false,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id, created_at);

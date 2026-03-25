-- ============================================================
-- GiaPha AI Advisor — Database Migration
-- Phase 1: Database Foundation
-- 
-- Run this manually in Supabase SQL editor.
-- Idempotent: safe to run multiple times.
-- ============================================================


-- ============================================================
-- STEP 1: Enable required extensions
-- ============================================================

-- pg_trgm: fuzzy trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: strip Vietnamese diacritics for tone-insensitive search
-- e.g. "Hanh" will match "Hành", "Hảnh", "Hạnh"
CREATE EXTENSION IF NOT EXISTS unaccent;


-- ============================================================
-- STEP 2: IMMUTABLE unaccent wrapper
-- PostgreSQL requires index expressions to use IMMUTABLE functions.
-- unaccent() is STABLE by default, so we wrap it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.f_unaccent(TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT unaccent('unaccent', $1) $$;


-- ============================================================
-- STEP 3: Fuzzy search indexes on persons table
-- ============================================================

-- Index on full_name (unaccented) for diacritic-insensitive search
CREATE INDEX IF NOT EXISTS idx_persons_full_name_trgm
  ON public.persons
  USING GIN (public.f_unaccent(full_name) gin_trgm_ops);

-- Index on other_names (unaccented) — users may be known by alternate names
CREATE INDEX IF NOT EXISTS idx_persons_other_names_trgm
  ON public.persons
  USING GIN (public.f_unaccent(COALESCE(other_names, '')) gin_trgm_ops);


-- ============================================================
-- STEP 4: Fuzzy search helper function
-- Returns top candidates matching a name query
-- Uses unaccent() on both sides to normalize tone marks
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_persons_fuzzy(
  search_query TEXT,
  similarity_threshold FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  other_names TEXT,
  generation INT,
  birth_year INT,
  death_year INT,
  is_deceased BOOLEAN,
  gender TEXT,
  score FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.other_names,
    p.generation,
    p.birth_year,
    p.death_year,
    p.is_deceased,
    p.gender::TEXT,
    GREATEST(
      similarity(public.f_unaccent(p.full_name), public.f_unaccent(search_query)),
      similarity(public.f_unaccent(COALESCE(p.other_names, '')), public.f_unaccent(search_query))
    ) AS score
  FROM public.persons p
  WHERE
    similarity(public.f_unaccent(p.full_name), public.f_unaccent(search_query)) > similarity_threshold
    OR similarity(public.f_unaccent(COALESCE(p.other_names, '')), public.f_unaccent(search_query)) > similarity_threshold
  ORDER BY score DESC
  LIMIT max_results;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_persons_fuzzy(TEXT, FLOAT, INT) TO authenticated;


-- ============================================================
-- STEP 5: chat_sessions table
-- Stores conversation history and agent scratchpad per session
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,                                         -- Auto-generated from first message
  messages    JSONB       NOT NULL DEFAULT '[]'::JSONB,    -- Full conversation history
  scratchpad  JSONB       NOT NULL DEFAULT '{}'::JSONB,    -- Agent state: candidates, confirmed_subject_id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user session lookups (ordered by recent first)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions(user_id, updated_at DESC);


-- ============================================================
-- STEP 6: chat_sessions updated_at trigger
-- Reuses existing handle_updated_at() function from schema.sql
-- ============================================================

DROP TRIGGER IF EXISTS tr_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER tr_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- ============================================================
-- STEP 7: Row Level Security for chat_sessions
-- Users can ONLY access their own sessions.
-- Admins do NOT get cross-user access (chat history is private).
-- ============================================================

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only see own sessions
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: user can only create sessions for themselves
DROP POLICY IF EXISTS "Users can create own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can create own chat sessions"
  ON public.chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update own sessions (messages appended, scratchpad updated)
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- DELETE: user can delete own sessions
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to confirm success.
-- ============================================================

-- 1. Confirm extensions are enabled
-- SELECT * FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');

-- 2. Test fuzzy search (should return similar names)
-- SELECT * FROM public.search_persons_fuzzy('Pham Phu Hanh');
-- SELECT * FROM public.search_persons_fuzzy('Pham Phu Han');    -- missing tone mark
-- SELECT * FROM public.search_persons_fuzzy('Pham Phu Haanh');  -- typo

-- 3. Confirm chat_sessions table exists with correct schema
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'chat_sessions' ORDER BY ordinal_position;

-- 4. Confirm RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'chat_sessions';

-- ============================================================
-- Members name-search performance migration
-- Adds an accent-insensitive, normalized, INDEXED search column on persons,
-- matching the semantics of utils/textSearch.ts -> normalizeForSearch().
--
-- WHY: today both /api/members/search and the list-view search fetch the
-- ENTIRE persons table in 1000-row pages and filter in JavaScript
-- (~1.0s on ~4k rows). With this column the app filters server-side with
-- `name_search ILIKE '%token%'` (trigram-indexed), ~10x faster and correct
-- for Vietnamese diacritics ("thiep" matches "Thiệp").
--
-- Run this manually in the Supabase SQL editor (production).
-- Idempotent: safe to run multiple times.
--
-- NOTE: `ADD COLUMN ... GENERATED ... STORED` rewrites the persons table once
-- and briefly takes an ACCESS EXCLUSIVE lock. On ~4k rows this is sub-second.
-- ============================================================

-- STEP 1: extensions ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram substring/ILIKE index support
CREATE EXTENSION IF NOT EXISTS unaccent;  -- strip Vietnamese diacritics

-- STEP 2: IMMUTABLE unaccent wrapper (index expressions require IMMUTABLE) ----
CREATE OR REPLACE FUNCTION public.f_unaccent(TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT unaccent('unaccent', $1) $$;

-- STEP 3: normalization that mirrors normalizeForSearch() in utils/textSearch.ts
--   JS: NFD -> strip combining marks -> đ/Đ -> d
--       -> replace non-alphanumeric runs with a space -> collapse -> lower -> trim
--   SQL: lower -> unaccent -> đ -> d -> [^a-z0-9]+ to space -> collapse -> trim
CREATE OR REPLACE FUNCTION public.f_name_search_norm(input TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE PARALLEL SAFE
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        translate(public.f_unaccent(lower(COALESCE(input, ''))), 'đ', 'd'),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- STEP 4: generated, normalized, searchable column ---------------------------
-- Haystack mirrors the app: full_name + birth_year + generation
-- (matchesSearchQuery([full_name, birth_year, generation], ...)).
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS name_search TEXT
  GENERATED ALWAYS AS (
    public.f_name_search_norm(
      full_name
      || ' ' || COALESCE(birth_year::TEXT, '')
      || ' ' || COALESCE(generation::TEXT, '')
    )
  ) STORED;

-- STEP 5: trigram GIN index for fast ILIKE '%token%' substring search --------
CREATE INDEX IF NOT EXISTS idx_persons_name_search_trgm
  ON public.persons USING GIN (name_search gin_trgm_ops);

-- ============================================================
-- VERIFICATION (run after applying)
-- ============================================================
-- 1) Column + index exist:
--    SELECT 1 FROM information_schema.columns
--      WHERE table_name='persons' AND column_name='name_search';
--    SELECT indexname FROM pg_indexes WHERE indexname='idx_persons_name_search_trgm';
--
-- 2) Diacritic-insensitive match works (should return "Thiệp" rows):
--    SELECT full_name FROM public.persons WHERE name_search ILIKE '%thiep%' LIMIT 5;
--
-- 3) Index is actually used (look for a Bitmap Index Scan on the trgm index):
--    EXPLAIN ANALYZE
--    SELECT * FROM public.persons WHERE name_search ILIKE '%gia%' LIMIT 60;

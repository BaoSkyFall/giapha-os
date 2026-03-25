# Phase 1: Database Foundation — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable fuzzy search on the `persons` table and create `chat_sessions` persistent storage. No application code or UI in this phase — pure database infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Migration Delivery
- **D-01:** SQL delivered as a plain file: `docs/ai-advisor-migration.sql` — user will execute it manually against Supabase. This matches the existing project convention (see `docs/schema.sql`).
- **D-02:** No Supabase CLI migration tooling — files are idempotent SQL (`IF NOT EXISTS`, `CREATE EXTENSION IF NOT EXISTS`).

### Fuzzy Search — Scope
- **D-03:** `pg_trgm` GIN index on `persons.full_name` (primary search target).
- **D-04:** Also search `persons.other_names` — users may be known by alternate names. Add a second GIN index or use a combined index on `COALESCE(full_name, '') || ' ' || COALESCE(other_names, '')`.
- **D-05:** Similarity threshold: > 0.3, return top 6 results ordered by score DESC. (Confirmed from PRD.)

### Fuzzy Search — Vietnamese Diacritic Normalization
- **D-06:** Normalize diacritics so that "Hanh" matches "Hành", "Hanh", etc. Implementation: use `unaccent` extension + a functional index combining `unaccent(full_name)` with `pg_trgm`. This requires enabling the `unaccent` extension.
- **D-07:** Search query must also apply `unaccent()` to both the column and the user's input: `similarity(unaccent(full_name), unaccent($1)) > 0.3`.

### `chat_sessions` Table
- **D-08:** Schema: `id UUID PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, messages JSONB NOT NULL DEFAULT '[]', scratchpad JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()`.
- **D-09:** Reuse existing `handle_updated_at()` trigger function for `updated_at` auto-management.
- **D-10:** RLS policy — users access ONLY their own sessions: `USING (auth.uid() = user_id)`. Admins do NOT get cross-user access (chat history is private).

### Agent's Discretion
- Index naming conventions (follow existing `idx_*` pattern from schema.sql)
- Whether to use a single composite trgm expression or two separate indexes for `full_name` + `other_names`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Schema
- `docs/schema.sql` — Full existing schema: `persons` table columns, RLS patterns, `handle_updated_at()` trigger, index naming convention (`idx_*`)

### PRD
- `PRD_GiaPha_AI_Advisor.md` §5.2 — Database schema spec, pg_trgm SQL template

### Migration Convention
- `docs/blog_migration.sql` — Example of plain SQL migration file format used in this project

</canonical_refs>

<deferred>
## Deferred Ideas

None from this discussion.
</deferred>

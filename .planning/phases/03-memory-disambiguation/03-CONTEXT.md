# Phase 3: Memory & Disambiguation — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Interactive discuss-phase session

<domain>
## Phase Boundary

Phase 3 delivers:
1. **Agent 4 (Clarifier)** — LLM-generated disambiguation question when `FOUND_MANY`
2. **Scratchpad persistence** — `confirmed_subject_id` saved to `chat_sessions.scratchpad` (Supabase only, no Vercel KV)
3. **Session continuity** — once subject confirmed, skip disambiguation on all subsequent turns in the same session
4. **Rate limiting** — deferred to Phase 6 (no implementation in Phase 3)

Phase 3 is **backend-only**. UI components (candidate cards, click-to-select) are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Storage: Supabase Only (No Vercel KV)

- **LOCKED:** Do NOT add `@vercel/kv` or any Vercel KV dependency
- `chat_sessions.scratchpad` JSONB column (already created in Phase 1) is the ONLY state store
- Scratchpad fields used: `{ confirmed_subject_id?: string, candidates?: PersonSearchResult[], pending_clarification?: boolean }`
- Rate limiting (API-05) is deferred — skip entirely in Phase 3

### Agent 4 — LLM-Generated Disambiguation Question

- **LOCKED:** Use LLM to generate the clarification question (Option A)
- Budget: ~80 tokens, `temperature: 0`, `stream: false`
- System prompt instructs Agent 4 to:
  - List up to 4 candidates with distinguishing info (generation, birth year, father name if available)
  - Ask ONE clear question in Vietnamese: e.g., "Bạn đang hỏi về ai trong số những người sau..."
  - Keep it concise — this is a question, not an answer
- Agent 4 output is a `StreamChunk` of type `{ type: 'clarify', question: string, candidates: PersonSearchResult[] }`
- **New chunk type** needs adding to `StreamChunk` union in `types/ai-advisor.ts`

### Disambiguation Resolution — Natural Reply Only (Phase 3)

- **LOCKED:** User resolves disambiguation via natural-language reply (Option A)
- No click-to-select UI in Phase 3 — that's Phase 5
- When `pending_clarification: true` in scratchpad + user sends follow-up:
  - Feed candidates back through Agent 2 (re-search with combined query: original name + follow-up context)
  - Agent 3 re-verifies — if `FOUND_ONE`, mark `confirmed_subject_id` and continue to Agent 5
  - If still `FOUND_MANY`, Agent 4 asks again (max 2 clarification rounds before fallback to "Xin lỗi, bạn có thể mô tả thêm không?")
- Clarification rounds tracked in `scratchpad.clarification_round` (int, 0-indexed)

### Session Continuity — Skip Disambiguation Once Confirmed

- **LOCKED:** When `scratchpad.confirmed_subject_id` exists at session start:
  - Agent 2 still searches (for new questions about different people)
  - Agent 3 checks: if new search returns empty OR the user's question appears to reference the confirmed subject → skip disambiguation, inject confirmed person into Agent 5 directly
  - Detection heuristic: if `intent.subject` is empty string (user asks "ông ấy" / "bà ấy" / pronoun) → use `confirmed_subject_id`

### Rate Limiting

- **DEFERRED:** API-05 rate limiting is skipped in Phase 3
- Will be implemented in Phase 6 (production readiness) using Supabase `rate_limits` table
- Remove from Phase 3 plans entirely

### the agent's Discretion

- Exact LLM prompt wording for Agent 4
- Whether to load confirmed subject details from Supabase in the pipeline (mini-fetch by ID)
- Error handling when scratchpad read fails (treat as new session)
- Max clarification rounds (2 is recommended — hardcode as constant `MAX_CLARIFICATION_ROUNDS = 2`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Implementation (existing patterns)
- `utils/ai-advisor/agent1-intent-parser.ts` — LLM proxy call pattern to replicate for Agent 4
- `utils/ai-advisor/agent3-verifier.ts` — `VerificationResult` type, `verifyCandidates()` function
- `utils/ai-advisor/agent5-narrator.ts` — async generator pattern for streaming
- `app/api/chat/route.ts` — full pipeline wiring, scratchpad load/save pattern

### Types to Extend
- `types/ai-advisor.ts` — add `clarify` to `StreamChunk` union, add `clarification_round` to `ChatScratchpad`

### Database Schema
- `docs/ai-advisor-migration.sql` — `chat_sessions` table structure and `scratchpad` column
- `docs/schema.sql` — `persons` table columns (for confirmed-subject mini-fetch)

### Planning
- `.planning/REQUIREMENTS.md` — AGT-04, AGT-06, MEM-02, MEM-04 (API-05 deferred)
- `.planning/ROADMAP.md` — Phase 3 success criteria

</canonical_refs>

<specifics>
## Specific Implementation Notes

### New StreamChunk type
```ts
| { type: 'clarify'; question: string; candidates: PersonSearchResult[] }
```
Add to `StreamChunk` union in `types/ai-advisor.ts`. The API route emits this instead of `narrating` when `FOUND_MANY` and no confirmed subject.

### Scratchpad updates
Add to `ChatScratchpad`:
```ts
clarification_round?: number   // 0-indexed, max 2
pending_clarification?: boolean
candidates?: PersonSearchResult[]  // top candidates saved for follow-up
```

### Pipeline branching (updated)
```
Agent 3: FOUND_MANY?
  └── confirmed_subject_id in scratchpad? → skip to Agent 5 with confirmed subject
  └── pending_clarification? → re-search with combined query → Agent 3 again
      └── FOUND_ONE? → save confirmed_subject_id, skip to Agent 5
      └── Still FOUND_MANY + round < MAX? → Agent 4 again
      └── round >= MAX? → Agent 5 with "không thể xác định" message
  └── fresh disambiguation → Agent 4 → emit clarify chunk → save scratchpad → done (no Agent 5 yet)
```

### Confirmed subject mini-fetch
When `confirmed_subject_id` found in scratchpad and `intent.subject` is empty/pronoun:
```ts
const { data: confirmedPerson } = await supabase
  .from('persons')
  .select('id, full_name, other_names, generation, birth_year, death_year, is_deceased, gender')
  .eq('id', scratchpad.confirmed_subject_id)
  .single()
```

</specifics>

<deferred>
## Deferred Ideas

- **API-05 Rate limiting** — deferred to Phase 6 (production readiness)
- **Click-to-select UI** for disambiguation candidates — Phase 5 (UI components)
- **Clarification via voice/structured input** — V2

</deferred>

---

*Phase: 03-memory-disambiguation*
*Context gathered: 2026-03-25 via interactive discuss-phase*

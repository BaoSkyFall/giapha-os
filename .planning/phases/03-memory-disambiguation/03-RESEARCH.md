# Phase 3: Memory & Disambiguation — Research

**Phase:** 3 — Memory, Disambiguation & Session Continuity
**Goal:** Handle duplicate names via multi-turn clarification and persist session state across page reloads.

---

## What Exists From Phase 2

### Pipeline already handles:
- `verifyCandidates()` returns `FOUND_MANY` with a `candidates[]` array
- `chat_sessions.scratchpad` JSONB column exists and is written on each turn
- Session loading reads `scratchpad` from DB at the start of each request
- `previousMessages[]` passed to agents for multi-turn context

### What Phase 2 does wrong for FOUND_MANY:
```ts
// Phase 2 stub — just uses top result, no disambiguation:
const subject = verification.status === "FOUND_MANY"
  ? verification.candidates[0]   // ← BAD: picks blindly
  : null;
```
Phase 3 replaces this with proper branching.

---

## Technical Approach

### New StreamChunk type
Add to `types/ai-advisor.ts`:
```ts
| { type: 'clarify'; question: string; candidates: PersonSearchResult[] }
```
This is emitted instead of narrating when `FOUND_MANY` and no confirmed subject.
The UI (Phase 5) renders it as a disambiguation card.

### Updated ChatScratchpad type
Add to `ChatScratchpad` in `types/ai-advisor.ts`:
```ts
clarification_round?: number     // 0-indexed, max MAX_CLARIFICATION_ROUNDS (2)
pending_clarification?: boolean  // true = last turn ended with clarify chunk
candidates?: PersonSearchResult[] // saved candidates for follow-up re-search
```

### Agent 4 Implementation Pattern
Same proxy call pattern as Agent 1 (non-streaming, temperature 0).
Budget: ~80 tokens.

```ts
// utils/ai-advisor/agent4-clarifier.ts
export async function generateClarification(
  intent: AgentIntent,
  candidates: PersonSearchResult[]
): Promise<string> // returns the question text
```

System prompt for Agent 4:
```
You are a Vietnamese genealogy assistant.
Multiple people match the search. Ask ONE concise question in Vietnamese to identify the right person.
List up to 4 candidates with: name, generation (đời), birth year (sinh).
Example format:
"Gia phả có [N] người tên [tên]. Bạn đang hỏi về ai?
- [Tên] (đời [X], sinh [Y])
- ..."
Output ONLY the question. No extra text.
```

### Re-Search for Disambiguation Resolution
When `scratchpad.pending_clarification === true`:
1. Build combined query: `${savedCandidateName} ${newMessage}`
2. Call `searchPersons(combinedQuery)` — pg_trgm will score higher for matches
3. Re-run `verifyCandidates()` on new results
4. If `FOUND_ONE`: save `confirmed_subject_id`, proceed to Agent 5
5. If `FOUND_MANY` and `round < MAX`: Agent 4 again, increment round
6. If `round >= MAX`: Agent 5 with null subject ("không thể xác định")

### Session Continuity (Subject Already Confirmed)
When `scratchpad.confirmed_subject_id` exists AND `intent.subject === ''` (pronoun reference):
1. Fetch person directly from Supabase by ID
2. Skip Agents 2 & 3 entirely → go straight to Agent 5
3. This covers follow-up questions like "ông ấy còn ai con cháu không?"

### Updated Pipeline Branching (full)
```
Agent 1 → intent
Agent 2 → candidates (skip if pronoun + confirmed_subject_id)
Agent 3 → VerificationResult

FOUND_NONE → Agent 5 with null (not found)
FOUND_ONE  → save confirmed_subject_id → Agent 5
FOUND_MANY →
  confirmed_subject_id in scratchpad? → fetch by ID → Agent 5
  pending_clarification?
    → re-search with combined query
    → FOUND_ONE? → save → Agent 5
    → FOUND_MANY + round < MAX → Agent 4 (increment round)
    → round >= MAX → Agent 5 with null
  fresh? → Agent 4 → emit 'clarify' chunk → save scratchpad → done
```

---

## Validation Architecture

### Automated Tests (TypeScript unit tests)
Test file: `utils/ai-advisor/__tests__/agent4-clarifier.test.ts`
```ts
// Mock PROXY_BASE_URL, verify:
// 1. Returns a non-empty string question
// 2. Question contains candidate names
// 3. Mock LLM failure returns fallback question
```

Test file: `utils/ai-advisor/__tests__/agent3-verifier.test.ts`  
(extend existing — add tests for score-gap disambiguation)

### Manual Verification
1. In Supabase SQL editor: `INSERT INTO persons (full_name, ...) VALUES ('Phạm Phú Tú', ...)` × 3 (different generations)
2. POST `/api/chat` with `{ "message": "Cho tôi biết về Phạm Phú Tú" }`
3. Should get `clarify` chunk instead of `narrating`
4. POST same sessionId with `{ "message": "con của ông Phạm Phú Ba" }`
5. Should get `narrating` response about the correct person

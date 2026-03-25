# Roadmap: GiaPha AI Advisor

**Milestone:** v1 MVP
**Phases:** 6
**Requirements:** 39 mapped, 39 covered ✓
**Granularity:** Standard

---

## Phase 1 — Database Foundation

**Goal:** Set up search infrastructure and persistent session storage so the pipeline has data to work with.

**Requirements:** DB-01, DB-02, DB-03, DB-04, MEM-03

**Plans:**
1. Enable `pg_trgm` extension via Supabase migration
2. Create GIN index on `members.name`
3. Write and verify fuzzy search SQL query (similarity > 0.3, top 6)
4. Create `chat_sessions` table migration with RLS policies

**Success Criteria:**
1. `SELECT similarity('Pham Phu Hanh', name) FROM members` returns results
2. Trigram search on `members` returns correct fuzzy matches in <200ms
3. `chat_sessions` table exists with correct schema and RLS enabled for authenticated users
4. Migration runs cleanly on Supabase — no errors

---

## Phase 2 — Core Agent Pipeline

**Goal:** Build the 5-agent pipeline and `POST /api/chat` endpoint that handles the happy path (1 unambiguous result).

**Requirements:** AGT-01, AGT-02, AGT-03, AGT-05, AGT-07, API-01, API-06, MEM-01

**Plans:**
1. Create `POST /api/chat` route skeleton with Supabase auth guard
2. Implement Agent 1 (Intent Parser) — LLM call via `PROXY_BASE_URL`
3. Implement Agent 2 (DB Search) — pg_trgm query
4. Implement Agent 3 (Verifier) — pure TypeScript branching
5. Implement Agent 5 (Narrator) — LLM streaming response with family context
6. Wire Vercel AI SDK `useChat()` streaming to API route

**Success Criteria:**
1. Asking "Tổ tiên đời đầu tiên là ai?" returns a streaming answer in <3 seconds
2. Agent 1 correctly extracts subject and query_type as JSON
3. Agent 5 response is in Vietnamese, conversational tone, grounded in injected data
4. Time-to-first-byte is <1 second (streaming starts quickly)

---

## Phase 3 — Memory, Disambiguation & Rate Limiting

**Goal:** Handle duplicate names via multi-turn clarification and persist session state across page reloads.

**Requirements:** AGT-04, AGT-06, MEM-02, MEM-04, API-05

**Plans:**
1. Set up Vercel KV — store `candidates[]` and `confirmed_subject_id` per session
2. Implement Agent 4 (Clarifier) — generates natural disambiguation question
3. Implement scratchpad persistence — save after every turn to `chat_sessions.scratchpad`
4. Implement session continuity — skip disambiguation if `confirmed_subject_id` already set
5. Implement rate limiting — 10 req/min/user via Vercel KV counters

**Success Criteria:**
1. Asking about "Phạm Phú Tú" (4 matches) prompts AI to ask for father's name / birth year
2. User replies "con ông Phạm Phú Ba" → pipeline resolves to 1 person without re-asking
3. Refreshing page and continuing session does NOT lose confirmed subject
4. 11th request within a minute returns 429 with friendly message

---

## Phase 4 — Session Management API

**Goal:** Enable full session CRUD so users can browse past conversations and delete old ones.

**Requirements:** API-02, API-03, API-04

**Plans:**
1. Implement `GET /api/chat/sessions` — list user sessions, ordered by updated_at DESC
2. Implement `GET /api/chat/sessions/:id` — load full message history
3. Implement `DELETE /api/chat/sessions/:id` — soft/hard delete with ownership check

**Success Criteria:**
1. List endpoint returns sessions belonging only to authenticated user (RLS passes)
2. Loading a past session restores full message history in correct order
3. Deleting another user's session returns 403
4. All three routes work end-to-end with session history sidebar

---

## Phase 5 — Pixel-Perfect Chat UI

**Goal:** Build the chat interface to exactly match the Stitch design (ai-advisor.html / ai-advisor.png).

**Requirements:** UI-01 through UI-21

**Plans:**
1. Create `/dashboard/ai-advisor` Next.js page with 3-column layout (sidebar + drawer + main)
2. Build fixed crimson icon sidebar — active `psychology` icon highlighted
3. Build session history drawer — "Bắt đầu phiên mới" button + scrollable session list
4. Build top app bar — title, green pulse indicator, search input, action icons
5. Build chat canvas — paper texture bg, lotus watermark, user/AI message bubbles
6. Build AI message card — gradient accent bar, temple_buddhist avatar, "Xem trong cây" link
7. Build thinking state — 3-dot bouncing + agent progress checklist
8. Build input footer — quick suggestion chips + main input + send button + disclaimer
9. Wire all UI components to actual API and session state (useChat, session CRUD)

**Success Criteria:**
1. Visual diff against ai-advisor.png shows <5% pixel difference (key layout/color matches exactly)
2. Heritage Crimson (#B31D1D) and Prosperity Gold (#E8B931) are correctly applied throughout
3. Thinking state animates correctly while API request is in-flight
4. Agent checklist items tick off as pipeline progresses (via streaming metadata)
5. Clicking a past session loads its history into chat canvas
6. "Xem trong cây gia phả" link navigates to correct member in family tree

---

## Phase 6 — Integration Testing & Production Readiness

**Goal:** Validate the full end-to-end flow with real clan data and prepare for deployment.

**Requirements:** (All v1 — final validation)

**Plans:**
1. Seed `chat_sessions` with test data; run all 3 conversation flows from PRD (found/duplicate/misspelling)
2. Load test with 20 concurrent users — verify <3s response time holds
3. Security audit: verify RLS blocks cross-user data access, API key never in client bundle
4. Write/run integration tests for the 5-agent pipeline with mocked LLM responses
5. Deploy to Vercel — verify environment variables, KV, and Supabase connection

**Success Criteria:**
1. Flow 1 (exact match): returns correct answer in <3 seconds
2. Flow 2 (duplicate names): 2-turn conversation resolves to correct person
3. Flow 3 (misspelling): pg_trgm finds correct person despite missing tone marks
4. 0 cross-user data leaks in RLS testing
5. Production Vercel deployment is live and all features functional

---

## Milestone Summary

| # | Phase | Key Output | Requirements |
|---|-------|-----------|--------------|
| 1 | Database Foundation | pg_trgm + chat_sessions | DB-01..04, MEM-03 |
| 2 | Core Agent Pipeline | Streaming /api/chat | AGT-01..03, 05, 07, API-01, 06, MEM-01 |
| 3 | Memory & Disambiguation | Multi-turn + KV | AGT-04, 06, MEM-02, 04, API-05 |
| 4 | Session Management API | CRUD endpoints | API-02..04 |
| 5 | Pixel-Perfect Chat UI | Full UI (Stitch match) | UI-01..21 |
| 6 | Integration & Deploy | Production-ready | All v1 |

---
*Roadmap created: 2026-03-25*

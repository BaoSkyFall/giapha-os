# GiaPha AI Advisor

## What This Is

An AI-powered conversational assistant embedded inside the existing Gia Phả OS Next.js genealogy platform. Family members can ask natural-language questions (in Vietnamese or English) about ~2,000 members across 13 generations and receive accurate, streaming answers from a 5-agent pipeline — handling fuzzy search, duplicate names, and multi-turn disambiguation.

## Core Value

**Finding the right person accurately** — the AI must correctly identify the exact family member being asked about, even with typos, duplicate names, or partial information, before answering anything.

## Requirements

### Validated

✓ Next.js 14 App Router — existing
✓ Supabase self-host PostgreSQL — existing
✓ Supabase Auth + RLS — existing
✓ Heritage Crimson design system (primary #B31D1D, secondary #E8B931) — existing
✓ Stitch-generated UI design — ai-advisor.html + ai-advisor.png (pixel-perfect reference, 100% fidelity required)

### Active

- [ ] `pg_trgm` extension + GIN index on `members.name` for fuzzy search
- [ ] `chat_sessions` table for persistent conversation history and scratchpad
- [ ] 5-agent pipeline: Intent Parser → DB Search → Verifier → Clarifier → Narrator
- [ ] `POST /api/chat` — main streaming endpoint (LLM calls via `PROXY_BASE_URL`)
- [ ] `GET/DELETE /api/chat/sessions` + `GET /api/chat/sessions/:id`
- [ ] Vercel KV (Redis) scratchpad for session state (rate limiting + confirmed_subject_id)
- [ ] Streaming chat UI integrated into dashboard — pixel-perfect match to Stitch design
- [ ] Session history sidebar with "New Session" button and past session list
- [ ] Thinking/loading state showing agent step-by-step progress (Xác minh → Truy vấn → Tổng hợp)
- [ ] "Xem trong cây gia phả" deeplink button in AI responses
- [ ] Quick suggestion chips (pre-set prompt shortcuts)
- [ ] Rate limiting: 10 req/min/user via Vercel KV

### Out of Scope

- Genealogy editing/adding members — not AI's responsibility; separate workflow
- Separate mobile app — web-first, responsive later
- Vector search / pgvector — Phase 2 only (triggered at >5,000 members)
- n8n workflow automation — Phase 3
- Multi-tenant support — Phase 3
- AI-detected genealogy errors — Phase 3

## Context

- **Existing stack**: Next.js 14 App Router, Supabase self-host, Tailwind CSS, TypeScript
- **Data scale**: ~2,000 members (500 living, 1,500 deceased), 13 generations — fits in LLM context (<100KB), no RAG needed
- **LLM routing**: All LLM calls go via `PROXY_BASE_URL` env var (never expose API keys to client)
- **UI reference**: `stitch/.stitch/designs/ai-advisor.html` — Heritage Crimson theme, Playfair Display headlines, Inter body, Material Symbols icons
- **Design tokens from Stitch**: primary=#B31D1D, secondary=#E8B931, background=#F7F3EA, surface-container-lowest=#FFFFFF
- **Layout from Stitch**: Fixed crimson icon-only sidebar (w-20) + session history drawer (w-72 from left-20) + main content area (ml-[360px])

## Constraints

- **Tech Stack**: Must use existing Next.js 14 / Supabase / Tailwind — no new frameworks
- **UI Fidelity**: Must match Stitch design pixel-perfectly (Heritage Crimson theme, exact layout, all animations)
- **Cost**: LLM cost must stay <$10 USD/month for 100 users (2,000 req/month)
- **Performance**: <3s end-to-end, <1s time-to-first-byte (streaming)
- **Security**: LLM keys never exposed to client; RLS enforced per user; rate-limit 10 req/min
- **No RAG needed**: Entire member dataset (<100KB) injected into LLM context in Phase 1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 5-agent pipeline in single API route | Avoids n8n/Langflow overhead at this scale | — Pending |
| Only Agent 1 + 5 call LLM | 60% cost saving vs naive approach | — Pending |
| Vercel KV for scratchpad | Free 256MB tier, <5ms latency, persists confirmed_subject_id | — Pending |
| pg_trgm over pgvector | No RAG needed at 2,000 members; simpler, built-in Supabase | — Pending |
| PROXY_BASE_URL pattern | Hides API keys, allows traffic routing/monitoring | — Pending |
| Stitch design as 100% pixel-perfect reference | Design system already established and approved | — Pending |

---
*Last updated: 2026-03-25 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

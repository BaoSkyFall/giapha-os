# Phase 4: Session Management API — Research

**Phase:** 4 — Session Management API
**Goal:** Enable full session CRUD so users can browse and delete past conversations.

---

## What Exists

### Patterns from codebase
- `app/api/blog/route.ts` — `NextResponse.json()`, `getIsAdmin()`, `try/catch` error pattern
- `app/api/blog/[id]/route.ts` — `params: Promise<{ id: string }>`, `await params`, GET/DELETE pattern
- `utils/supabase/queries.ts` — `getSupabase()` (cached), `getUser()` (cached)
- `app/api/chat/route.ts` — `getUser()` auth guard, RLS via `.eq("user_id", user.id)`

### Database
- `chat_sessions(id, user_id, title, messages, scratchpad, created_at, updated_at)` 
- RLS policy: SELECT, INSERT, UPDATE, DELETE WHERE `user_id = auth.uid()` — **RLS enforces ownership at DB level**

---

## Routes Needed

| Route | Handler | Returns |
|-------|---------|---------|
| `GET /api/chat/sessions` | List user's sessions | `{ sessions: [{ id, title, created_at, updated_at }] }` - no messages for perf |
| `GET /api/chat/sessions/[id]` | Full session with messages | `{ session: ChatSession }` |
| `DELETE /api/chat/sessions/[id]` | Hard delete | `{ ok: true }` |

## Key Design Decisions
- **RLS does the heavy work**: ownership checks are automatic — RLS returns nothing for wrong `user_id`
- **List endpoint omits `messages`**: avoids returning large JSONB array for sidebar rendering
- **Hard delete** (not soft): consistent with project simplicity; RLS blocks cross-user deletes
- **No query params needed**: list is ordered by `updated_at DESC` only; pagination deferred to v2

---

## File Structure
```
app/api/chat/
  route.ts                    ← existing (POST chat)
  sessions/
    route.ts                  ← NEW: GET /api/chat/sessions
    [id]/
      route.ts                ← NEW: GET + DELETE /api/chat/sessions/[id]
```

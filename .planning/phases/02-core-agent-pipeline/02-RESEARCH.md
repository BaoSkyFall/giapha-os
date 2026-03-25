# Phase 2: Core Agent Pipeline — Research

**Phase:** 2 — Core Agent Pipeline
**Goal:** Build the 5-agent pipeline and `POST /api/chat` endpoint that handles the happy path.

---

## Codebase Context

### Existing API Pattern
File: `app/api/blog/route.ts`
```ts
// Pattern: import getUser/getIsAdmin from @/utils/supabase/queries
// Use cookies() + createClient() from @/utils/supabase/server
// Return NextResponse.json() with appropriate status codes
// Error logging: console.error({ error }, 'Msg')
```

### Supabase Client (Server-side)
- `utils/supabase/server.ts` → `createClient(cookieStore)` — SSR cookie-aware client
- `utils/supabase/queries.ts` → `getUser()`, `getProfile()`, `getSupabase()` — cached per-request

### Dashboard Layout
- `app/dashboard/layout.tsx` — wraps children in `<UserProvider>` + `<DashboardSidebar>` + `<DashboardHeader>`
- Child route at `app/dashboard/ai-advisor/page.tsx` (Phase 5)
- Auth guard: `getUser()` → `redirect('/login')` if null

### Missing Dependencies (Need Install)
- `ai` (Vercel AI SDK) — not in package.json
- `@ai-sdk/openai` or custom provider — for LLM calls via PROXY_BASE_URL
- No existing streaming infrastructure

---

## Technical Approach

### Streaming Architecture

**Not using `useChat()` from Vercel AI SDK** — because the project's LLM calls go through `PROXY_BASE_URL` (a custom proxy), not directly to OpenAI. Instead:

1. Use `ReadableStream` + `TransformStream` for streaming responses from the API route
2. Use the native `fetch()` + `Response` with `ReadableStream` body
3. Stream custom JSON chunks: `{ type: 'agent_step', step: 'parsing' }`, `{ type: 'text', delta: '...' }`, `{ type: 'done' }`

This is simpler than Vercel AI SDK when using a custom proxy. The UI (Phase 5) reads these chunks with `EventSource` or `fetch()` streaming.

**API route pattern:**
```ts
// app/api/chat/route.ts
export async function POST(request: NextRequest) {
  // 1. Auth guard
  // 2. Parse body: { message, sessionId? }
  // 3. Run pipeline
  // 4. Return ReadableStream
}
```

### Agent Pipeline Design

All 5 agents run server-side in sequence within the single API route. Only Agents 1 and 5 call the LLM.

```
User message
    │
    ▼
Agent 1: Intent Parser (LLM call ~100 tokens)
    │  → { subject: "Phạm Phú Hành", query_type: "profile" }
    ▼
Agent 2: DB Search (SQL only — no LLM)
    │  → candidates[] from search_persons_fuzzy()
    ▼
Agent 3: Verifier (pure TypeScript — no LLM)
    │  → FOUND_ONE | FOUND_MANY | FOUND_NONE
    ├── FOUND_ONE → Agent 5
    ├── FOUND_MANY → Agent 4 (Phase 3)
    └── FOUND_NONE → Agent 5 (with "not found" context)
    ▼
Agent 5: Narrator (LLM streaming ~400 tokens)
    │  → Stream response chunks to client
    ▼
Save to chat_sessions
```

### LLM Proxy Call Pattern
```ts
const response = await fetch(`${process.env.PROXY_BASE_URL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.PROXY_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gemini-2.0-flash',
    messages: [...],
    stream: true,
  }),
});
```

### Data Flow — Streaming Response Format

The API streams newline-delimited JSON (NDJSON):
```
{"type":"agent_step","step":"parsing","label":"Đang phân tích câu hỏi..."}
{"type":"agent_step","step":"searching","label":"Đang tìm kiếm trong gia phả..."}
{"type":"agent_step","step":"verifying","label":"Xác minh danh tính..."}
{"type":"agent_step","step":"narrating","label":"Tổng hợp hồ sơ..."}
{"type":"text","delta":"Theo thông tin trong gia phả, "}
{"type":"text","delta":"ông Phạm Phú Hành sinh năm 1954..."}
{"type":"done","sessionId":"abc-123","subject":{"id":"...","name":"..."}}
```

### chat_sessions Persistence
```ts
// After streaming completes:
await supabase.from('chat_sessions').upsert({
  id: sessionId,
  user_id: user.id,
  messages: [...existingMessages, newUserMsg, newAiMsg],
  scratchpad: { confirmed_subject_id: subject.id }
})
```

### Types to Create
`types/ai-advisor.ts`:
```ts
export type AgentStep = 'parsing' | 'searching' | 'verifying' | 'narrating'
export type StreamChunk =
  | { type: 'agent_step'; step: AgentStep; label: string }
  | { type: 'text'; delta: string }
  | { type: 'done'; sessionId: string; subject?: PersonSummary }
  | { type: 'error'; message: string }

export interface PersonSummary {
  id: string; full_name: string; generation: number | null;
  birth_year: number | null; death_year: number | null; is_deceased: boolean;
}

export interface AgentIntent {
  subject: string; // extracted name
  query_type: 'profile' | 'relationship' | 'fact' | 'count' | 'unknown';
  language: 'vi' | 'en';
}

export interface PipelineContext {
  userMessage: string;
  intent: AgentIntent;
  candidates: PersonSearchResult[];
  confirmedSubject?: PersonSummary;
  sessionId: string;
  userId: string;
}
```

---

## Dependency Decisions

### No Vercel AI SDK needed for Phase 2
Because `PROXY_BASE_URL` is custom, native `fetch()` + `ReadableStream` is simpler and more controllable. Vercel AI SDK `useChat()` is for Phase 5 UI — and even then, may need a custom adapter.

### Environment Variables Required
```
PROXY_BASE_URL=https://your-proxy.example.com/v1
PROXY_API_KEY=sk-...
```

---

## Validation Architecture

### Unit Tests
- Agent 1: mock LLM response → verify JSON parsing
- Agent 2: test `search_persons_fuzzy` RPC call with mock Supabase
- Agent 3: test branching logic (FOUND_ONE, FOUND_MANY, FOUND_NONE)
- Agent 5: mock LLM streaming → verify text chunks forwarded

### Integration Test
- `POST /api/chat` with a real session cookie → verify stream starts within 1s
- Verify `chat_sessions` row created in Supabase after request completes

### Manual Verification
- Open DevTools Network tab
- Send `POST /api/chat` with `{ message: "Tổ tiên đời đầu tiên là ai?" }`
- Watch stream: should see `agent_step` events then `text` deltas then `done`

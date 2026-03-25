# Requirements: GiaPha AI Advisor

**Defined:** 2026-03-25
**Core Value:** Finding the right person accurately — correct identification before any answer

## v1 Requirements

### Database & Search

- [ ] **DB-01**: `pg_trgm` extension enabled in Supabase PostgreSQL
- [ ] **DB-02**: GIN trigram index created on `members.name` column
- [ ] **DB-03**: Fuzzy search query returns top-6 candidates with similarity score >0.3
- [ ] **DB-04**: `chat_sessions` table created with `id, user_id, messages jsonb[], scratchpad jsonb, created_at, updated_at`

### Agent Pipeline

- [x] **AGT-01**: Agent 1 (Intent Parser) extracts `{subject, query_type}` from user message via LLM (~100 tokens)
- [x] **AGT-02**: Agent 2 (DB Search) executes pg_trgm fuzzy query and returns candidate list
- [x] **AGT-03**: Agent 3 (Verifier) categorizes: 0 results / 1 result / multiple results
- [x] **AGT-04**: Agent 4 (Clarifier) generates natural-language disambiguation question when multiple results found
- [x] **AGT-05**: Agent 5 (Narrator) generates conversational answer from confirmed data via LLM (~400 tokens)
- [x] **AGT-06**: `confirmed_subject_id` persisted in Vercel KV scratchpad — reused across turns in same session
- [x] **AGT-07**: Full pipeline runs within single `POST /api/chat` request, streaming response

### API Routes

- [x] **API-01**: `POST /api/chat` — authenticates Supabase session, runs 5-agent pipeline, returns streaming response
- [x] **API-02**: `GET /api/chat/sessions` — returns list of user's past chat sessions
- [x] **API-03**: `GET /api/chat/sessions/:id` — returns full message history for a session
- [x] **API-04**: `DELETE /api/chat/sessions/:id` — deletes a session
- [x] **API-05**: Rate limiting enforced at 10 requests/minute/user via Vercel KV
- [x] **API-06**: All LLM calls route through `PROXY_BASE_URL` — API key never exposed to client

### Memory & Session

- [x] **MEM-01**: Layer 1 — conversation messages array sent with each LLM call
- [x] **MEM-02**: Layer 2 — Vercel KV scratchpad stores `candidates[]` and `confirmed_subject_id` per session (30-min TTL)
- [ ] **MEM-03**: Layer 3 — `chat_sessions` table persists messages + scratchpad permanently (user can return later)
- [x] **MEM-04**: Once subject confirmed, subsequent questions in session skip disambiguation

### Chat UI — Layout (Stitch design pixel-perfect)

- [x] **UI-01**: Fixed crimson sidebar (`w-20`, `bg-[#B31D1D]`) with icon-only navigation and `psychology` icon active/highlighted
- [ ] **UI-02**: Session history drawer (`w-72`, `left-20`) with "Lịch sử hỏi đáp" title and "Bắt đầu phiên mới" button
- [ ] **UI-03**: Session history list with active item highlighted (left border + crimson bg)
- [ ] **UI-04**: Main content area starts at `ml-[360px]` with sticky top app bar
- [ ] **UI-05**: Top app bar shows "Trợ lý AI Gia Phả" (Playfair Display italic), green "Đang hoạt động" pulse indicator, search input, and action icons
- [ ] **UI-06**: Chat canvas with lotus SVG watermark (opacity-5, bottom-right)

### Chat UI — Messages

- [ ] **UI-07**: User messages: right-aligned, white bubble, `rounded-2xl rounded-tr-none`, right gold border `border-r-4 border-[#E8B931]`
- [ ] **UI-08**: AI messages: left-aligned, white bubble, `rounded-2xl rounded-tl-none`, top crimson border `border-t-4 border-primary`, with `temple_buddhist` avatar
- [ ] **UI-09**: AI response card has gold-to-crimson gradient accent bar at top
- [ ] **UI-10**: "Xem trong cây gia phả →" deeplink appears in AI response when a specific person is identified
- [ ] **UI-11**: Message list items render with gold dot bullets for list answers

### Chat UI — Thinking State

- [ ] **UI-12**: Thinking state shows 3-dot bounce animation with "Đang tìm kiếm trong gia phả..." label
- [ ] **UI-13**: Agent step progress shown as checklist: "Xác minh danh tính" ✓ → "Truy vấn cơ sở dữ liệu" ✓ → "Tổng hợp hồ sơ..." (spinning)

### Chat UI — Input Area

- [ ] **UI-14**: Quick suggestion chips: pill buttons with hover state `hover:border-primary hover:text-primary`
- [ ] **UI-15**: Main input: `pl-12 pr-16 py-4`, `auto_awesome` icon, full-width, rounded-2xl, crimson focus border
- [ ] **UI-16**: Send button: crimson `bg-primary`, `rounded-xl`, `send` icon, right-side absolute
- [ ] **UI-17**: Footer disclaimer: "THÔNG TIN AI CUNG CẤP CÓ THỂ CẦN ĐƯỢC XÁC MINH VỚI TRƯỞNG TỘC"

### Chat UI — Styling (Design System)

- [ ] **UI-18**: Fonts: Playfair Display (headlines), Inter (body/labels), Newsreader available
- [ ] **UI-19**: Paper texture background on chat canvas (`bg-[#F7F3EA]` with pattern overlay)
- [ ] **UI-20**: All animations: `animate-in fade-in slide-in-from-bottom-4` on messages
- [x] **UI-21**: Material Symbols Outlined icons throughout

## v2 Requirements

### Future Phases

- **V2-01**: AI story mode — tell family history by topic
- **V2-02**: Lunar calendar death anniversary reminders
- **V2-03**: If >5,000 members: pgvector semantic search
- **V2-04**: Mobile-responsive chat UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| Genealogy editing via AI | Separate admin workflow, not AI's role |
| Separate mobile app | Web-first for Phase 1 |
| n8n workflow automation | Phase 3 only |
| Multi-tenant support | Phase 3 only |
| OAuth login | Supabase email/password sufficient |
| AI error detection in data | Phase 3 only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| DB-03 | Phase 1 | Pending |
| DB-04 | Phase 1 | Pending |
| AGT-01 | Phase 2 | Complete |
| AGT-02 | Phase 2 | Complete |
| AGT-03 | Phase 2 | Complete |
| AGT-04 | Phase 2 | Complete |
| AGT-05 | Phase 2 | Complete |
| AGT-06 | Phase 3 | Complete |
| AGT-07 | Phase 2 | Complete |
| API-01 | Phase 2 | Complete |
| API-02 | Phase 4 | Complete |
| API-03 | Phase 4 | Complete |
| API-04 | Phase 4 | Complete |
| API-05 | Phase 3 | Complete |
| API-06 | Phase 2 | Complete |
| MEM-01 | Phase 2 | Complete |
| MEM-02 | Phase 3 | Complete |
| MEM-03 | Phase 1 | Pending |
| MEM-04 | Phase 3 | Complete |
| UI-01 | Phase 5 | Complete |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |
| UI-07 | Phase 5 | Pending |
| UI-08 | Phase 5 | Pending |
| UI-09 | Phase 5 | Pending |
| UI-10 | Phase 5 | Pending |
| UI-11 | Phase 5 | Pending |
| UI-12 | Phase 5 | Pending |
| UI-13 | Phase 5 | Pending |
| UI-14 | Phase 5 | Pending |
| UI-15 | Phase 5 | Pending |
| UI-16 | Phase 5 | Pending |
| UI-17 | Phase 5 | Pending |
| UI-18 | Phase 5 | Pending |
| UI-19 | Phase 5 | Pending |
| UI-20 | Phase 5 | Pending |
| UI-21 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initialization*

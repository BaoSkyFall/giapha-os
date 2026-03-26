# PRODUCT REQUIREMENTS DOCUMENT

### Genealogy AI Advisor System

**Version 1.0**
**March 2026**
**Status:** Draft — Pending Approval

| Overview |
| :--- |
| The system allows family members to converse with an AI acting as a family tree assistant, accurately answering about 2,000 members across 13 generations. |

-----

## 1\. Product Overview

### 1.1 Objective

Build an AI advisory feature integrated into the existing Next.js genealogy system, allowing family members to ask questions in natural language and receive accurate answers from a helpful AI Assistant that holds the entire family history across 13 generations.

### 1.2 Context

  * The existing genealogy system built on Next.js 14 + Supabase (self-host) already has data for \~2,000 members (500 living, 1,500 deceased) across 13 generations.
  * The current problem is that users can only view the family tree statically — they cannot ask natural questions, look up complex relationships, or search when they don't know the exact name.

### 1.3 Scope

  * AI chat feature acting as a family tree assistant.
  * Handle fuzzy search (misspellings, duplicate names, multiple results).
  * Multi-agent pipeline: parse → search → verify → answer.
  * Store conversation history and scratchpad by session.
  * Limitations: does not include genealogy editing functions, no separate mobile app.

-----

## 2\. Target Users

### 2.1 Scale

| User Group | Details |
| :--- | :--- |
| Living members | \~500 people in the clan |
| Actual users on the system | \~100 people (with accounts) |
| Expected usage frequency | 20 questions / user / month |
| Total requests / month | "\~2,000 requests" |
| Average age | 25 — 70 years old |
| Language used | "Vietnamese (main), possibly English" |

### 2.2 Core User Needs

  * Find ancestors, descendants, or siblings of a specific person.
  * Ask about the history and stories of figures in the clan.
  * Determine their own position in the family tree (which generation they belong to).
  * Find people when the exact name is not remembered (only remembering the father's name or generation).
  * Check if a person is in the family tree.

### 2.3 Current Pain Points

  * Must scroll the family tree screen to search — time-consuming.
  * Don't know the exact name → cannot find.
  * Don't understand indirect relationships (e.g., who is her grandfather?).
  * No one to 'explain' — only dry data.

-----

## 3\. Functional Requirements

### 3.1 Multi-Agent Architecture (5 Agents)

  * The entire pipeline runs in a single API request.
  * The user only sees 1 question → 1 answer. The agents work sequentially 'behind the scenes':

| Agent | Task | Technology |
| :--- | :--- | :--- |
| Agent 1 — Intent Parser | Parse the question: asking about who? asking what? which generation? Output structured JSON | LLM via Proxy (Claude Sonnet) |
| Agent 2 — DB Search | Fuzzy search Supabase using pg\_trgm. Return a list of candidates with scores | Supabase + pg\_trgm SQL |
| Agent 3 — Verifier | Categorize results: 0 / 1 / many. Determine the next branch | Pure TypeScript logic |
| Agent 4 — Clarifier | "If 0: suggest similar names. If many: ask for more info (father, generation, spouse...). If 1: confirm" | TypeScript + template |
| Agent 5 — Narrator | "Receive confirmed data, write the answer in a helpful AI assistant tone" | LLM via Proxy (Claude Sonnet) |

### 3.2 Handling Duplicate Names — Clarification Process

  * This is the core feature distinguishing this system from a regular chatbot.
  * When there are multiple results with the same name:
      * Agent 3 detects 2-6 candidates with the same name.
      * Agent 4 generates a clarification question in natural language, without a dry list.
      * Example response: 'There are 4 people named Pham Phu Tu in the family tree from generation 6 to 11. Do you know who his father was, or approximately what year he was born?'
      * User replies → pipeline runs a second time with full context → finds the exact match.

### 3.3 Handling Misspellings

  * Fuzzy search with pg\_trgm in Supabase handles cases like:
      * Wrong tone marks: 'Hanh' → 'Hanh', 'Hanh'.
      * Missing words: 'Pham Phu' → finds all members with the surname Pham Phu.
      * Added words: 'Pham Phu Haanh' → 'Pham Phu Hanh'.
      * Similarity threshold: \> 0.3, returning a maximum of 6 results, sorted by descending score.

### 3.4 Memory System — 3 Layers

| Memory Layer | Storage | Lifecycle |
| :--- | :--- | :--- |
| Layer 1: Conversation History | "messages[] array sent with each LLM call" | End of session / close tab |
| Layer 2: Agent Scratchpad | "Vercel KV (Redis) — candidates, confirmed\_subject\_id" | 1 session (30 minutes) |
| Layer 3: Persistent Memory | "Supabase table chat\_sessions — messages JSON, scratchpad" | Permanent — remembers when user returns |

  * Result of Layer 2 (Scratchpad): Once a user has identified a person (e.g., Pham Phu Tu, generation 9, son of Pham Phu Ba), subsequent questions in the same session will not ask 'who are you asking about?' again.
  * The agent automatically uses `confirmed_subject_id` to query directly.

-----

## 4\. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
| :--- | :--- |
| Average response time (happy path) | \< 3 seconds (end-to-end) |
| Time to first byte (streaming) | \< 1 second |
| Agent 2 DB query (pg\_trgm) | \< 200ms |
| Concurrent users | Minimum 20 concurrent users |
| Target uptime | 99.5% (Vercel SLA) |

### 4.2 Security

  * **Proxy Architecture:** The frontend client **never** calls the LLM provider directly. All LLM requests are routed through the Next.js server using a configured `PROXY_BASE_URL` to protect API keys and prevent client-side abuse.
  * Supabase Row Level Security (RLS): each user only accesses authorized data.
  * API route authenticates Supabase session token before each request.
  * Rate limiting: 10 requests/minute/user (Vercel KV).
  * Do not save personally identifiable information into LLM prompt logs.
  * Chat history encrypted at rest (Supabase AES-256).

### 4.3 Scalability

  * Data of 2,000 members: can dump the entirety into the LLM context (\< 100KB) — no RAG needed in Phase 1.
  * When \> 5,000 members: switch to vector embedding + pgvector (Phase 2).
  * LLM provider-agnostic architecture — can swap Claude ↔ GPT-4o easily by updating the `PROXY_BASE_URL` and internal SDK config.

-----

## 5\. Technical Architecture

### 5.1 Overall Stack

| Layer | Technology | Reason Chosen |
| :--- | :--- | :--- |
| Frontend / Framework | Next.js 14 App Router (existing) | "Already available, App Router supports streaming" |
| Chat Streaming | Vercel AI SDK — useChat() | "5 lines of code, built-in streaming hook" |
| Authentication | Supabase Auth + RLS (existing) | "Already available, automatic security" |
| Database | Supabase self-host PostgreSQL (existing) | "Already available, adding pg\_trgm is enough" |
| Fuzzy Search | PostgreSQL pg\_trgm extension | "Built-in Supabase, no extra service added" |
| Session / Scratchpad | Vercel KV (Redis managed) | "Free tier 256MB is sufficient, low latency" |
| LLM Provider via Proxy | Anthropic Claude Sonnet via `PROXY_BASE_URL` | Keeps API keys hidden, allows traffic routing and monitoring. |
| Hosting | Vercel (free tier) | 100 users won't hit the limit |
| Workflow Orchestration | Pure TypeScript in API Route | No need for n8n/Langflow at this scale |

### 5.2 Database Schema

Genealogy tables (existing or to be created):

| Table Name | Description |
| :--- | :--- |
| `members` | "id, name, birth\_year, death\_year, generation\_number, bio, avatar\_url, is\_alive" |
| `relationships` | "id, person\_id, related\_id, type (father/mother/spouse/child)" |
| `generations` | "id, number (1-13), name, description" |
| `chat_sessions` | "id, user\_id, messages jsonb[], scratchpad jsonb, created\_at, updated\_at" |

Setup pg\_trgm (add to Supabase):

| SQL Command |
| :--- |
| `-- Enable extension` <br> `CREATE EXTENSION IF NOT EXISTS pg_trgm;` |
| `-- Create GIN index for fast search` <br> `CREATE INDEX idx_members_name_trgm ON members USING GIN (name gin_trgm_ops);` |
| `-- Query fuzzy search` <br> `"SELECT *, similarity(name, $1) AS score FROM members"` <br> `"WHERE similarity(name, $1) > 0.3 ORDER BY score DESC LIMIT 6;"` |

### 5.3 API Route Structure & Proxy Configuration

**Environment Configuration:**

  * `PROXY_BASE_URL`: The custom endpoint URL used by the Next.js server to communicate with the LLM API provider.
  * `LLM_API_KEY`: Stored securely on the server; never exposed to the client.

**Routes:**
| Route | Function |
| :--- | :--- |
| `POST /api/chat` | "Main endpoint — acts as the client-facing proxy. Runs the 5-agent pipeline, calls the LLM via `PROXY_BASE_URL`, and returns streaming response." |
| `GET /api/chat/sessions` | Fetch the list of the user's past chat sessions |
| `DELETE /api/chat/sessions/:id` | Delete an old session |
| `GET /api/chat/sessions/:id` | Load the history of a specific past session |

### 5.4 System Prompt — Agent 5 (Narrator)

This is the core prompt setting the persona:

| System Prompt Instructions |
| :--- |
| "You are an AI Assistant for the [Surname] family tree, holding the entire genealogy data for 13 generations. You speak in a helpful, clear, and professional tone — do not read raw data dryly." |
| Rules: (1) Do not disclose unconfirmed information. (2) If there is no data, clearly state that you do not know. (3) Address the user politely as an assistant. |
| Genealogy data (injected from Agent 2): `{family_context_json}` |

-----

## 6\. User Experience

### 6.1 Main Conversation Flows

**Flow 1 — Found immediately (1 result):**

| Who | Content |
| :--- | :--- |
| User | "Who are my ancestors? I am Pham Phu Hanh" |
| [Behind the scenes] A1 | → `{subject: 'Pham Phu Hanh', query_type: 'ancestors'}` |
| [Behind the scenes] A2 | → Found 1 person, generation=12 |
| [Behind the scenes] A3 | → 1 result, confirmed |
| [Behind the scenes] A5 | → Write response in AI assistant tone |
| AI (displayed) | "Your ancestors begin with Pham Van Duc — the founder of your family tree in the first generation, born in 1823 in Quang Nam..." |

**Flow 2 — Duplicate name (multiple results):**

| Who | Content |
| :--- | :--- |
| User | "Is Mr. Pham Phu Tu in the family tree?" |
| AI (turn 1) | "There are 4 people named Pham Phu Tu in the family tree, from generation 6 to 11. Do you know who his father was, or approximately what year he was born?" |
| User | "Son of Pham Phu Ba" |
| [Behind the scenes] | → Scratchpad filter candidates → 1 person remaining |
| AI (turn 2) | "Understood, you are asking about Pham Phu Tu from the 9th generation — the eldest son of Pham Phu Ba. He was born in 1901 and passed away in 1978..." |

**Flow 3 — Misspelling:**

| Who | Content |
| :--- | :--- |
| User | "Find Pham Phu Hanh" (missing tone marks) |
| [Behind the scenes] A2 | → pg\_trgm finds 'Pham Phu Hanh' with a score of 0.82 |
| AI | "Are you asking about Pham Phu Hanh from the 12th generation? If so, he is the youngest son of Pham Phu Long..." |

### 6.2 Chat UI Interface

  * Integrate into the existing Next.js page — do not create a separate app.
  * Sidebar displaying the history of previous sessions.
  * Streaming response displaying word by word — do not wait for it to load completely.
  * Display 'searching...' while the agents are running.
  * 'View in family tree' button when the AI answers about a specific person.

-----

## 7\. Cost & Infrastructure

### 7.1 Estimated Monthly Costs

| Service | Usage | Cost / Month |
| :--- | :--- | :--- |
| Vercel (hosting + KV) | "Free tier: 100GB bandwidth, 256MB Redis" | $0 |
| Supabase self-host | Already available — separate server cost | $0 extra |
| Claude Sonnet via Proxy | "2,000 req x 500 tokens = 1M tokens" | \~$3 — $5 USD |
| Total | "100 users, 20 questions/month" | ~$3 — $5 USD/month |

### 7.2 Token Optimization

  * Only 2 out of the 5 agents call the LLM API — reducing costs by 60% compared to a naive approach:
      * Agent 1 (Intent Parser): \~100 tokens/request.
      * Agent 5 (Narrator): \~400 tokens/request.
      * Agent 2, 3, 4: Pure TypeScript logic — 0 tokens, 0 LLM latency.

-----

## 8\. Implementation Roadmap

### Phase 1 — MVP (3 Weeks)

| Week | Task | Deliverable |
| :--- | :--- | :--- |
| Week 1 | Setup pg\_trgm + chat\_sessions schema + basic proxy /api/chat route | "Agent 1 & 5 working, basic chat possible" |
| Week 2 | Agent 2/3/4 + Vercel KV scratchpad + handling duplicate names | "Full 5-agent pipeline, handling all cases" |
| Week 3 | Chat UI + streaming + testing with real clan data | "Complete feature, ready to deploy" |

### Phase 2 — Upgrade (After 3 Months)

  * Add feature: AI telling family history stories by topic.
  * Notification: remind death anniversaries according to the lunar calendar.
  * If \> 5,000 members: switch to vector search with pgvector.
  * Mobile-friendly chat UI.

### Phase 3 — Expansion (After 6 Months)

  * n8n workflow: automatically sync data when a new member is added.
  * Multiple clans using the same platform (multi-tenant).
  * Feature: AI detects systematic errors, recommends adding missing information.

-----

## 9\. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| "Genealogy data has many errors, missing information" | Agent 5 is trained to clearly state 'no data' instead of guessing |
| User inputs too many mistakes → cannot find | pg\_trgm threshold 0.3 + suggest closest names + ask again |
| LLM costs spike if there are many questions | Rate limit 10 req/min/user + cache duplicate answers |
| LLM hallucinate — invents genealogy information | "Agent 5 is only allowed to read data from injected context, not use prior knowledge" |
| User reloads → loses scratchpad | Layer 3 Persistent saves every scratchpad to Supabase after each turn |
| Vercel KV runs out of free tier | "256MB is enough for 2,000 sessions — monitor, upgrade $20/month if needed" |

-----

## 10\. Success Metrics

| Metric | Current (Baseline) | 3-Month Goal |
| :--- | :--- | :--- |
| Rate of finding the correct person when asked | N/A (no feature) | \> 85% of questions have accurate answers |
| Average response time | N/A | \< 3 seconds |
| User return rate | N/A | \> 60% after the first month |
| Number of questions / user / month | 0 | \> 10 questions |
| User satisfaction (survey) | N/A | \> 4.0 / 5.0 |
| LLM cost / month | $0 | \< $10 USD |


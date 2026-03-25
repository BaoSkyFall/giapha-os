<!-- GSD:project-start source:PROJECT.md -->
## Project

**GiaPha AI Advisor**

An AI-powered conversational assistant embedded inside the existing Gia Phả OS Next.js genealogy platform. Family members can ask natural-language questions (in Vietnamese or English) about ~2,000 members across 13 generations and receive accurate, streaming answers from a 5-agent pipeline — handling fuzzy search, duplicate names, and multi-turn disambiguation.

**Core Value:** **Finding the right person accurately** — the AI must correctly identify the exact family member being asked about, even with typos, duplicate names, or partial information, before answering anything.

### Constraints

- **Tech Stack**: Must use existing Next.js 14 / Supabase / Tailwind — no new frameworks
- **UI Fidelity**: Must match Stitch design pixel-perfectly (Heritage Crimson theme, exact layout, all animations)
- **Cost**: LLM cost must stay <$10 USD/month for 100 users (2,000 req/month)
- **Performance**: <3s end-to-end, <1s time-to-first-byte (streaming)
- **Security**: LLM keys never exposed to client; RLS enforced per user; rate-limit 10 req/min
- **No RAG needed**: Entire member dataset (<100KB) injected into LLM context in Phase 1
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

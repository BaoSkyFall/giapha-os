# Phase 5: Pixel-Perfect Chat UI — Research

**Phase:** 5 — Pixel-Perfect Chat UI (UI-01 through UI-21)
**Goal:** Build the chat interface matching exactly the Stitch ai-advisor.html design.

---

## Stitch Design Analysis

### Layout Architecture — CRITICAL
The Stitch design is a **standalone full-screen layout** with its own 3-column structure:
- **Column 1:** Fixed crimson icon sidebar (`w-20`, `left-0`, `bg-[#B31D1D]`)
- **Column 2:** Session history drawer (`w-72`, `left-20`, full-height minus top-16px gap)
- **Column 3:** Main content (`ml-[360px]`, full-height)

⚠️ **This CANNOT use the existing `DashboardLayout`** (which adds `DashboardHeader` + `DashboardSidebar`).
The AI Advisor page needs its own `layout.tsx` that bypasses the parent layout entirely.

**Solution:** Put the AI Advisor page at `app/(ai-advisor)/dashboard/ai-advisor/` with a `layout.tsx` that does its own auth guard but renders NO header or sidebar from the parent.

### Color Tokens (from Tailwind config in Stitch HTML)
```
primary:     #B31D1D  (Heritage Crimson)
secondary:   #E8B931  (Prosperity Gold)
surface:     #F7F3EA  (Rice Paper)
surface-bright: #FFFCF5
surface-variant: #F1EDE2
on-surface:  #201212
```

### Typography
- `font-headline` = Playfair Display serif (titles, persona name)
- `font-body` = Inter sans-serif (body text)
- Material Symbols Outlined (icons: psychology, temple_buddhist, auto_awesome, send, history, add)

### Exact Measurements
- Icon sidebar: `w-20`, fixed left
- Session drawer: `w-72`, `left-20`, top 64px (below app bar)
- Main starts at: `ml-[360px]`
- App bar height: `h-16`
- Message max width: user `max-w-[70%]`, AI `max-w-[80%]`

### Components Breakdown → Plan Files
1. **Layout & Page scaffold** — layout.tsx + page.tsx + global hook (`useChat`)
2. **Icon sidebar + Session drawer** — ClientSidebar component
3. **Top app bar** — CityAppBar component  
4. **Chat canvas + messages** — ChatCanvas, UserMessage, AiMessage components
5. **Thinking state + Input footer** — ThinkingState, ChatInput components + API wiring

---

## Existing Codebase Patterns to Reuse

- Auth guard: `const user = await getUser(); if (!user) redirect("/login");` (from dashboard/layout.tsx)
- Supabase client: `getSupabase()` from `@/utils/supabase/queries`
- Tailwind classes: `heritage-red`, `heritage-gold` already defined in existing tailwind config
- Google Fonts: already loaded in `_document.tsx` or `layout.tsx` (needs verification)
- No Vercel AI SDK — use `fetch()` with NDJSON streaming (consistent with Phase 2 API design)

---

## Route Structure
```
app/
  (ai-advisor)/               ← route group — bypasses dashboard layout
    dashboard/
      ai-advisor/
        layout.tsx            ← own auth guard, Google Fonts, Material Symbols
        page.tsx              ← server component: loads sessions list
        AiAdvisorClient.tsx   ← client component: full interactive UI
```

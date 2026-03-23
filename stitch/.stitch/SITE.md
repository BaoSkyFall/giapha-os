# Project Vision & Constitution

> **AGENT INSTRUCTION:** Read this file before every iteration. It serves as the project's "Long-Term Memory." If `next-prompt.md` is empty, pick the highest priority item from Section 5 OR invent a new page that fits the project vision.

## 1. Core Identity
* **Project Name:** Tộc Phạm Phú — Tộc Phạm Phú
* **Stitch Project ID:** `7998967920457136760`
* **Mission:** An open-source, self-hosted Vietnamese family genealogy platform for managing family trees, tracking events (including lunar calendar), and finding kinship terms (danh xưng).
* **Target Audience:** Vietnamese family elders/admins, editors, and members who need to collaboratively maintain their gia phả.
* **Voice:** Warm, respectful, culturally rooted, modern yet traditional.

## 2. Visual Language (Stitch Prompt Strategy)
*Strictly adhere to these descriptive rules when prompting Stitch.*

* **The "Vibe" (Adjectives):**
    * *Primary:* **Heritage** (Culturally rooted, Vietnamese patterns, ancestral warmth).
    * *Secondary:* **Elegant** (Paper-like cards, gold borders, generous spacing).
    * *Tertiary:* **Functional** (Clear data hierarchy, intuitive tree navigation).

* **Color Philosophy (Semantic):**
    * **Backgrounds:** Warm rice paper off-white (#F7F3EA). Traditional, inviting canvas.
    * **Headers/Nav:** Heritage Red (#B31D1D) with white/gold text.
    * **Accents:** Prosperity Gold (#E8B931) for borders, highlights, and hover states.
    * **Text:** Altar Wood dark brown (#3E2723) for body, white for dark backgrounds.

## 3. Architecture & File Structure
* **Root:** `site/public/`
* **Asset Flow:** Stitch generates to `.stitch/designs/` → Validate → Move to `site/public/`.
* **Navigation Strategy:**
    * **Global Header:** Logo "Tộc Phạm Phú", Nav links: Gia phả, Lịch sử dòng họ, Thành viên, Sự kiện, Tra cứu quan hệ, CTA button "Khám phá cây gia phả".
    * **Global Footer:** Deep Heritage Red background, family info, contact details, copyright "© 2026 Tộc Phạm Phú", gold accents.

## 4. Live Sitemap (Current State)
*The Agent MUST update this section when a new page is successfully merged.*

* [x] `index.html` — Landing page: hero, features, ancestor highlights, event timeline.
* [x] `tree.html` — Interactive family tree dashboard with sidebar navigation.
* [x] `members.html` — Member directory with filters, search, and member cards grid.
* [x] `kinship.html` — Kinship term finder (Danh Xưng / Tra cứu quan hệ).
* [x] `events.html` — Family events: birthdays, death anniversaries (ngày giỗ), custom events.
* [x] `stats.html` — Family statistics & demographics dashboard.
* [x] `member-detail.html` — Member profile detail view with bio, relationships, quick actions.
* [x] `member-form.html` — Add/Edit member form with avatar, dates, relationships.
* [x] `users.html` — Admin user management panel with role assignment.
* [x] `login.html` — Phone number + 6-digit PIN login page.
* [x] `register.html` — Registration with phone OTP verification + 6-digit PIN setup.
* [x] `forgot-password.html` — Password reset with phone OTP verification + new 6-digit PIN.
* [x] `about.html` — About page with mission, features, family history, and open source info.
* [x] `lineage.html` — Lineage book view mimicking traditional gia phả format.
* [x] `data.html` — Data import/export center for JSON, CSV, GEDCOM, PDF.
* [x] `gallery.html` — Family media gallery for photos, documents, and historical records.

## 5. The Roadmap (Backlog)
*All primary pages have been completed! 🎉*

## 6. Creative Freedom Guidelines
*The backlog is empty. Follow these guidelines to innovate.*

1. **Stay On-Brand:** New pages must fit the "Heritage + Elegant + Functional" vibe with Vietnamese cultural elements.
2. **Enhance the Core:** Support the genealogy management experience.
3. **Naming Convention:** Use lowercase, descriptive filenames.

### Ideas to Explore
- [ ] `setup.html` — Initial database setup and configuration guide
- [ ] `mobile-tree.html` — Mobile-optimized family tree view

## 7. Rules of Engagement
1. Do not recreate pages in Section 4.
2. Always update `next-prompt.md` before completing.
3. Consume ideas from Section 6 when you use them.
4. Keep the loop moving.
5. **CRITICAL:** Maintain consistent header and footer across ALL pages.

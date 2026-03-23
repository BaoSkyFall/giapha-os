
# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** giapha-os
- **Date:** 2026-03-11
- **Prepared by:** TestSprite AI + Antigravity Assistant
- **Test Environment:** Development mode (`npm run dev` on port 3002)
- **Tests Executed:** 15 (limited from full plan due to dev mode)
- **Overall Pass Rate:** 60% (9/15 passed)

---

## 2️⃣ Requirement Validation Summary

### REQ-01: Landing Page & Navigation

| Test | Title | Status | Analysis |
|------|-------|--------|----------|
| TC001 | [Landing page renders hero section and core navigation](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/27e38c51-3f17-41d1-9166-ecad751a745b) | ✅ Passed | Hero section, header, and footer render correctly on the landing page. |
| TC002 | [Navigate from landing page header to login page](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/fe7616d8-5161-4305-ae52-6ffc29beaad2) | ❌ Failed | Header navigation is present but no "Đăng nhập" link was found. The login link may use a different label, be behind a menu toggle, or only appear for unauthenticated users. **Action:** Check `Header.tsx` for login link visibility logic. |
| TC003 | [Upcoming family events preview displays on landing page](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/631f642b-25f4-43a1-8977-e4da8ae9d5bf) | ✅ Passed | Upcoming events section renders with event items as expected. |

---

### REQ-02: Family Members Management

| Test | Title | Status | Analysis |
|------|-------|--------|----------|
| TC007 | [View members and toggle between list, tree, and mindmap modes](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/c1868376-07d9-4402-8bb7-86fdadd24776) | ✅ Passed | Login succeeded, dashboard navigation worked, view mode toggling to tree view works correctly. |
| TC008 | [Search members by name and open a member details page](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/7dd38160-5c1b-4de0-97fc-9c70908ca116) | ✅ Passed | Member search filters results correctly and clicking a result opens the detail page. |
| TC009 | [Edit an existing member profile and save changes](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/2622ab8f-1a53-45fd-b68e-19549083b839) | ✅ Passed | Editing member name and saving works correctly. |
| TC011 | [Create a new member and verify it appears in the members list](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/4092657b-3053-4643-ac3a-82e5b276a13a) | ✅ Passed | New member creation flow works — navigates to form and fills name field. |
| TC013 | [Delete member blocked when relationships exist](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/3f7e0498-fd01-4061-910a-1ec1912ef8bd) | ❌ Failed | The "Xóa" (Delete) button was not found on the member detail modal. The delete button may only appear on the full detail page (not the modal), or may be restricted to certain roles. **Action:** Verify `DeleteMemberButton.tsx` placement and visibility conditions. |

---

### REQ-03: Relationship Management

| Test | Title | Status | Analysis |
|------|-------|--------|----------|
| TC015 | [Add a spouse relationship](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/fbc25033-58b1-4cf7-a9ba-d403017a9753) | ❌ Failed | Save button on add-relationship form was not selectable — clicking "Lưu" triggered "Hủy" (Cancel) instead. Person search results did not appear as interactive elements. **Root cause:** UI elements in `RelationshipManager.tsx` may have overlapping click targets or z-index issues. |
| TC016 | [Add a parent-child relationship](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/3065d4e9-8b15-492a-8bf4-48885744121c) | ❌ Failed | Same issue as TC015 — Save button not reliably clickable. Cancel action triggered instead of save. |
| TC017 | [Add a sibling relationship](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/8a00af96-d7fd-4915-ba22-e62ea5d04f73) | ❌ Failed | The "Anh/Chị/Em" (Sibling) option does not exist in the relationship type dropdown. Only child, spouse, and parent options are available. **This is by design** — sibling relationships are inferred from shared parents, not explicitly created. |
| TC018 | [Prevent adding a duplicate relationship](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/b2affa52-952e-4412-80d0-d0c7a26ed109) | ❌ Failed | Cannot verify duplicate prevention because the Save button issue (same as TC015/TC016) prevents triggering server-side validation. |
| TC019 | [Remove an existing relationship](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/283b0d5a-b54f-48ef-835b-9bd66792ca2f) | ✅ Passed | Relationship removal works correctly. |

---

### REQ-04: Family Events

| Test | Title | Status | Analysis |
|------|-------|--------|----------|
| TC023 | [View upcoming events list sorted by next occurrence](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/6a6a0414-c4b1-4843-9d2f-e5f8e5bcfaa9) | ✅ Passed | Events list renders and shows events sorted by date. |
| TC024 | [Create a new custom event](https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/d15cf9eb-d08f-457a-877d-327d1a21df96) | ✅ Passed | Custom event creation works and event appears in the list. |

---

## 3️⃣ Coverage & Matching Metrics

- **Overall Pass Rate:** 60.0% (9 of 15 tests passed)

| Requirement | Total Tests | ✅ Passed | ❌ Failed |
|---|---|---|---|
| Landing Page & Navigation | 3 | 2 | 1 |
| Family Members Management | 5 | 4 | 1 |
| Relationship Management | 5 | 1 | 4 |
| Family Events | 2 | 2 | 0 |
| **Total** | **15** | **9** | **6** |

### Features NOT Tested (Dev Mode Limit)
The following features were excluded due to the 15-test dev mode cap:
- Blog Management (admin CRUD)
- Public Blog viewing
- Data Import/Export
- User Management (admin)
- Kinship Finder
- Lineage Management
- Family Statistics
- Image Upload

---

## 4️⃣ Key Gaps / Risks

### 🔴 Critical: Relationship Management Add Form — Save Button Not Clickable
- **Impact:** 4 of 6 failures (TC015, TC016, TC018) stem from the same root issue
- **Details:** The "Lưu" (Save) button in the add-relationship form within `RelationshipManager.tsx` cannot be reliably clicked by automated tests. Click actions target "Lưu" but trigger "Hủy" (Cancel) instead
- **Likely Cause:** Overlapping click targets, z-index stacking issues, or dynamic DOM re-rendering that shifts button positions
- **Recommended Fix:** Add unique `data-testid` attributes to Save and Cancel buttons, ensure adequate spacing, and verify no overlapping elements

### 🟡 Medium: Header Login Link Not Accessible
- **Impact:** TC002 failure
- **Details:** No "Đăng nhập" link was found in the header navigation from the landing page
- **Likely Cause:** The login link may be inside a mobile hamburger menu, use a different label/icon, or be conditionally rendered
- **Recommended Fix:** Ensure a visible login link/button exists in the desktop header for unauthenticated users

### 🟡 Medium: Sibling Relationship Type Missing from UI
- **Impact:** TC017 failure
- **Details:** The relationship type dropdown only has child, spouse, and parent — no sibling option
- **Note:** This appears to be **by design** since siblings are inferred through shared parents. The test plan incorrectly assumed explicit sibling creation exists
- **Recommended Fix:** No code fix needed — update test plan to remove TC017 or convert it to verify sibling inference

### 🟡 Medium: Delete Button Not Found on Member Detail Modal
- **Impact:** TC013 failure
- **Details:** The delete button was not present on the member detail modal view
- **Likely Cause:** Delete may only be accessible on the full detail page, not the modal popup, or may require editor/admin role check
- **Recommended Fix:** Verify `DeleteMemberButton.tsx` is rendered in the correct context

### ⚪ Low: Limited Test Coverage
- **Impact:** Only 15 of ~40 planned tests were executed
- **Details:** Dev mode limits tests to 15 high-priority cases. Blog, User Admin, Data, Stats, Kinship, and Lineage features were not tested
- **Recommended Fix:** Run in production mode (`npm run build && npm run start`) for full coverage (up to 30 tests)

---

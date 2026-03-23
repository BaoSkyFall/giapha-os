
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** giapha-os
- **Date:** 2026-03-11
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Landing page renders hero section and core navigation
- **Test Code:** [TC001_Landing_page_renders_hero_section_and_core_navigation.py](./TC001_Landing_page_renders_hero_section_and_core_navigation.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/27e38c51-3f17-41d1-9166-ecad751a745b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Navigate from landing page header to login page
- **Test Code:** [TC002_Navigate_from_landing_page_header_to_login_page.py](./TC002_Navigate_from_landing_page_header_to_login_page.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Header navigation present but no 'Đăng nhập' link found in the header.
- No interactive element leading to "/login" was found on the landing page header.
- Cannot verify navigation to the login page because the required header link is missing.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/fe7616d8-5161-4305-ae52-6ffc29beaad2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Upcoming family events preview displays on landing page
- **Test Code:** [TC003_Upcoming_family_events_preview_displays_on_landing_page.py](./TC003_Upcoming_family_events_preview_displays_on_landing_page.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/631f642b-25f4-43a1-8977-e4da8ae9d5bf
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 View members and toggle between list, tree, and mindmap modes
- **Test Code:** [TC007_View_members_and_toggle_between_list_tree_and_mindmap_modes.py](./TC007_View_members_and_toggle_between_list_tree_and_mindmap_modes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/c1868376-07d9-4402-8bb7-86fdadd24776
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Search members by name and open a member details page from results
- **Test Code:** [TC008_Search_members_by_name_and_open_a_member_details_page_from_results.py](./TC008_Search_members_by_name_and_open_a_member_details_page_from_results.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/7dd38160-5c1b-4de0-97fc-9c70908ca116
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Edit an existing member profile and save changes
- **Test Code:** [TC009_Edit_an_existing_member_profile_and_save_changes.py](./TC009_Edit_an_existing_member_profile_and_save_changes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/2622ab8f-1a53-45fd-b68e-19549083b839
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Create a new member and verify it appears in the members list
- **Test Code:** [TC011_Create_a_new_member_and_verify_it_appears_in_the_members_list.py](./TC011_Create_a_new_member_and_verify_it_appears_in_the_members_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/4092657b-3053-4643-ac3a-82e5b276a13a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Delete member is blocked when relationships exist and user cancels deletion
- **Test Code:** [TC013_Delete_member_is_blocked_when_relationships_exist_and_user_cancels_deletion.py](./TC013_Delete_member_is_blocked_when_relationships_exist_and_user_cancels_deletion.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Member-level 'Xóa' (Delete) button not found in the member detail modal; only relationship delete buttons (aria-label='Xóa mối quan hệ') are available.
- Deletion integrity-check message (instructing to remove relationships first, e.g., 'xóa các mối quan hệ') could not be triggered or observed because the member deletion flow cannot be initiated.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/3f7e0498-fd01-4061-910a-1ec1912ef8bd
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Add a spouse relationship successfully from a member detail page
- **Test Code:** [TC015_Add_a_spouse_relationship_successfully_from_a_member_detail_page.py](./TC015_Add_a_spouse_relationship_successfully_from_a_member_detail_page.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Quick-add spouse was not saved: the quick-add form was filled but the 'Hủy' (Cancel) button was clicked instead of 'Lưu' (Save).
- Selecting an existing person from the person-search failed: pressing Enter closed the add-relationship form and did not select a person.
- Dynamic person search results did not appear as interactive elements after typing, preventing selection by click.
- Previously available quick-add element indexes became unavailable during interactions, indicating page state changes that prevented completing the save.
- Member detail still displays 'Vợ / Chồng' as 'Chưa có thông tin.' so the spouse relationship was not created or reflected.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/fbc25033-58b1-4cf7-a9ba-d403017a9753
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Add a parent-child relationship successfully from a member detail page
- **Test Code:** [TC016_Add_a_parent_child_relationship_successfully_from_a_member_detail_page.py](./TC016_Add_a_parent_child_relationship_successfully_from_a_member_detail_page.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Save button not found or not exposed as an interactive element on the Add Relationship form, preventing the relationship from being saved.
- Attempts to save resulted in the 'Hủy' (Cancel) action being triggered instead of a successful save, indicating the Save control is not selectable.
- The new parent-child relationship could not be persisted and therefore did not appear on the member detail view (expected text 'Cha' or 'Mẹ' or 'Con' not present).
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/3065d4e9-8b15-492a-8bf4-48885744121c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Add a sibling relationship successfully from a member detail page
- **Test Code:** [TC017_Add_a_sibling_relationship_successfully_from_a_member_detail_page.py](./TC017_Add_a_sibling_relationship_successfully_from_a_member_detail_page.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Relationship type 'Anh/Chị/Em' (Sibling) option not found in the 'Loại quan hệ' dropdown on the Add Relationship form.
- The 'Loại quan hệ' dropdown only presents 'Người này là Con của...', 'Người này là Vợ/Chồng của...', and 'Người này là Bố/Mẹ của...', which map to child/spouse/parent and do not allow adding a sibling relationship.
- The test cannot proceed to add or verify a sibling relationship because no UI control exists to select 'Anh/Chị/Em'.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/8a00af96-d7fd-4915-ba22-e62ea5d04f73
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Prevent adding a duplicate relationship (duplicate constraint error)
- **Test Code:** [TC018_Prevent_adding_a_duplicate_relationship_duplicate_constraint_error.py](./TC018_Prevent_adding_a_duplicate_relationship_duplicate_constraint_error.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Lưu (Save) button not found as an interactive element on the add-relationship form, preventing triggering server-side duplicate validation.
- Previous attempt to save activated the Cancel ('Hủy') action instead (click targeted Save but Cancel was triggered), indicating the Save action could not be reliably executed.
- The duplicate error message "đã tồn tại" was not visible on the page after interactions, so duplicate behavior could not be verified.
- Without a clickable Save control, it is not possible to confirm whether a second relationship entry would be prevented.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/b2affa52-952e-4412-80d0-d0c7a26ed109
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Remove an existing relationship successfully
- **Test Code:** [TC019_Remove_an_existing_relationship_successfully.py](./TC019_Remove_an_existing_relationship_successfully.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/283b0d5a-b54f-48ef-835b-9bd66792ca2f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC023 View upcoming events list sorted by next occurrence
- **Test Code:** [TC023_View_upcoming_events_list_sorted_by_next_occurrence.py](./TC023_View_upcoming_events_list_sorted_by_next_occurrence.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/6a6a0414-c4b1-4843-9d2f-e5f8e5bcfaa9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Create a new custom event and confirm it appears in the list
- **Test Code:** [TC024_Create_a_new_custom_event_and_confirm_it_appears_in_the_list.py](./TC024_Create_a_new_custom_event_and_confirm_it_appears_in_the_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/1d066afb-6280-46cd-b141-296972d6e426/d15cf9eb-d08f-457a-877d-327d1a21df96
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **60.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---
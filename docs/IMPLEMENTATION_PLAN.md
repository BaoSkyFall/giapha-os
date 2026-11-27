# KẾ HOẠCH TRIỂN KHAI TỐI ƯU HIỆU NĂNG TRANG /dashboard/members
**Dự án:** Tộc Phạm Phú (`giapha-os`)  
**Tác giả:** Senior Performance Engineer + Database Engineer + Frontend Architect  
**Phân loại Task:** Ưu tiên theo ROI (Return on Investment): P0 (Bắt buộc cốt lõi) -> P1 (Bộ nhớ đệm & Chỉ mục) -> P2 (Nâng cao).

---

## Danh Sách Nhiệm Vụ Phân Kỳ

### NHÓM P0: TỐI ƯU CỐT LÕI (LOẠI BỎ ANTI-PATTERN LOAD ALL & OVERFETCHING)

#### Task P0.1: Thu hẹp danh sách cột trong List View (Chống Overfetching)
- **Files bị ảnh hưởng:**
  - `app/dashboard/members/page.tsx`
- **Thay đổi cụ thể:**
  - Thay vì `supabase.from("persons").select("*", { count: "exact" })`, định nghĩa hằng số:
    ```ts
    const LIST_PERSON_COLUMNS = "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, avatar_url, is_deceased, is_in_law, birth_order, generation, branch";
    ```
  - Áp dụng `select(LIST_PERSON_COLUMNS, { count: "exact" })` cho cả đường dẫn tìm kiếm server và phân trang bình thường.
- **Lý do:**
  - Loại bỏ các cột văn bản nặng như `note` (tiểu sử dài vài KB mỗi dòng), `phone_number`, `current_residence`, `address`, `other_names`, `birth_date_text`, `death_date_text` khỏi danh sách thẻ card.
- **Kỳ vọng cải thiện:**
  - Giảm dung lượng payload của mỗi trang từ ~250KB–1.8MB xuống còn ~20KB–30KB (giảm 85–90%).
  - Tăng tốc độ giải mã JSON ở trình duyệt và giảm băng thông truyền tải.
- **Rủi ro:**
  - Rất thấp. `PersonCard.tsx` chỉ sử dụng các trường nêu trên, chi tiết đầy đủ vẫn được tải riêng khi bấm mở `MemberDetailModal`.
- **Kế hoạch Test:**
  - Kiểm tra giao diện thẻ `PersonCard` hiển thị đầy đủ tên, năm sinh, năm mất, giới tính, vai vế (con thứ mấy, đời mấy, chi nào), ảnh đại diện.

---

#### Task P0.2: Xây dựng Subtree API Endpoint cho Tree & Mindmap (Progressive Loading)
- **Files bị ảnh hưởng:**
  - `app/api/genealogy/subtree/route.ts` (MỚI)
- **Thay đổi cụ thể:**
  - Tạo endpoint `GET /api/genealogy/subtree?rootId={uuid}&depth={number}`:
    1. Nhận `rootId` và `depth` (mặc định depth = 2: Root -> Con cái -> Cháu).
    2. Truy vấn đệ quy hoặc theo vòng lặp cấp độ:
       - Lấy thông tin `rootPerson`.
       - Lấy các quan hệ `marriage` (vợ/chồng) và người hôn phối liên quan.
       - Lấy các quan hệ `biological_child`/`adopted_child` (con cái) của người này.
       - Lấy tiếp con cái của các con cái (cháu) nếu `depth >= 2`.
    3. Trả về payload gọn gàng:
       ```json
       {
         "rootId": "...",
         "persons": [...], // Danh sách người thuộc subtree (chỉ các trường cần thiết)
         "relationships": [...] // Danh sách cạnh quan hệ thuộc subtree
       }
       ```
- **Lý do:**
  - Chấm dứt triệt để việc Server Component phải tải 100% DB (10.000–100.000 người) chỉ để vẽ 1 cây gia phả.
- **Kỳ vọng cải thiện:**
  - Thời gian phản hồi API Subtree < 50ms.
  - Payload trả về < 15KB thay vì vài MB.
- **Rủi ro:**
  - Cần bảo đảm định dạng `persons` và `relationships` tương thích 100% với `buildAdjacencyLists` trong `treeHelpers.ts`.
- **Kế hoạch Test:**
  - Gọi test trực tiếp endpoint với Thủy Tổ và các nhánh phụ; kiểm tra tính toàn vẹn của danh sách cha-con và vợ-chồng.

---

#### Task P0.3: Tái Cấu Trúc Tree & Mindmap View Thành Progressive Rendering
- **Files bị ảnh hưởng:**
  - `app/dashboard/members/page.tsx`
  - `components/DashboardViews.tsx`
  - `components/MindmapTree.tsx`
  - `components/FamilyTree.tsx`
- **Thay đổi cụ thể:**
  - Trong `app/dashboard/members/page.tsx`: Khi `view !== 'list'`, KHÔNG fetch toàn bộ DB nữa. Chỉ fetch root node được chọn (hoặc mặc định Thủy Tổ) kèm subtree 2 thế hệ đầu tiên qua hàm service nội bộ.
  - Trong `FamilyTree.tsx`: Thêm cơ chế expand/collapse giới hạn độ sâu (depth limit mặc định 2–3 thế hệ). Chỉ vẽ các nhánh đang được mở rộng.
  - Khi người dùng bấm mở rộng một node chưa có dữ liệu con cháu trong bộ nhớ: Client gọi `GET /api/genealogy/subtree?rootId={childId}&depth=1` để lấy tiếp nhánh con và gộp vào `personsMap` / `relationships` cục bộ.
- **Lý do:**
  - Tránh DOM Explosion (vẽ hàng ngàn node cùng lúc làm sập trình duyệt).
  - Loại bỏ hoàn toàn dòng thông báo "Gốc hiển thị này làm cây gia phả lớn và web load chậm..." và tình trạng giật lag.
- **Kỳ vọng cải thiện:**
  - Initial load Tree & Mindmap giảm từ 1.7s–3.0s xuống dưới 300ms.
  - Số lượng DOM nodes vẽ ban đầu giảm từ hàng ngàn xuống dưới 50 thẻ.
- **Rủi ro:**
  - Cần đảm bảo khi mở rộng node, trạng thái cuộn (scroll position) không bị nhảy lung tung.
- **Kế hoạch Test:**
  - Kiểm tra mở các cụ Thủy Tổ, bấm mở rộng/thu gọn các đời F1, F2, F3; đảm bảo các đường nối và vị trí thẻ ổn định.

---

### NHÓM P1: BỘ NHỚ ĐỆM, CHỈ MỤC & TRẢI NGHIỆM TƯƠNG TÁC

#### Task P1.1: Client-Side In-Memory Cache Cho Graph & View Switching
- **Files bị ảnh hưởng:**
  - `components/DashboardContext.tsx`
  - `components/DashboardViews.tsx`
- **Thay đổi cụ thể:**
  - Duy trì một `graphStoreRef` ở cấp Context hoặc module-level:
    - Lưu trữ tập hợp các `persons` và `relationships` đã từng fetch trong phiên làm việc.
    - Khi người dùng chuyển tab: `List` -> `Tree` -> `Mindmap` -> `List`, hệ thống tái sử dụng ngay dữ liệu đã có trong bộ nhớ, không kích hoạt request server lặp lại.
- **Lý do:**
  - Giải quyết phàn nàn của người dùng: *"Chuyển List / Tree / Mindmap không gây request dư thừa"*, *"View Mindmap có lúc đứng khá lâu ở trạng thái Đang tải dữ liệu..."*.
- **Kỳ vọng cải thiện:**
  - Chuyển đổi giữa các chế độ xem diễn ra tức thì (< 16ms, 1 frame 60fps).
- **Rủi ro:**
  - Cần invalidate hoặc cập nhật cache khi người dùng tạo mới hoặc chỉnh sửa thông tin thành viên (đã có hook `memberMutation` trong `DashboardContext` để đồng bộ).
- **Kế hoạch Test:**
  - Chuyển tab liên tục List -> Tree -> Mindmap và quan sát DevTools Network: không phát sinh request trùng lặp.

---

#### Task P1.2: Bổ Sung Index Tối Ưu Cho PostgreSQL
- **Files bị ảnh hưởng:**
  - `docs/schema.sql`
  - `docs/perf-indexes-migration.sql` (MỚI)
- **Thay đổi cụ thể:**
  - Tạo file migration chứa các index có giải trình:
    ```sql
    -- 1. Index hỗ trợ sắp xếp theo đời và thứ tự sinh (Tree & List query)
    CREATE INDEX IF NOT EXISTS idx_persons_generation_birth_order 
      ON public.persons (generation, birth_order, id);

    -- 2. Index hỗ trợ sắp xếp cập nhật mới nhất (Mặc định trang danh sách)
    CREATE INDEX IF NOT EXISTS idx_persons_updated_at_desc 
      ON public.persons (updated_at DESC, id ASC);

    -- 3. Composite index cho quan hệ cha-con và vợ-chồng
    CREATE INDEX IF NOT EXISTS idx_relationships_person_a_type 
      ON public.relationships (person_a, type);
    CREATE INDEX IF NOT EXISTS idx_relationships_person_b_type 
      ON public.relationships (person_b, type);
    ```
- **Lý do:**
  - Tối ưu Index Scan cho cả Subtree traversal lẫn List filtering/sorting.
- **Kỳ vọng cải thiện:**
  - Thời gian truy vấn DB giảm từ 15–40ms xuống 1–3ms.
- **Rủi ro:**
  - Tăng nhẹ dung lượng ổ đĩa (~3MB cho 50.000 bản ghi), hoàn toàn không đáng kể.
- **Kế hoạch Test:**
  - Kiểm tra tính hợp lệ của cú pháp SQL, chạy thử trên local / staging.

---

#### Task P1.3: Nâng Cấp Trải Nghiệm Loading (Non-blocking UX)
- **Files bị ảnh hưởng:**
  - `components/DashboardViews.tsx`
  - `components/DashboardMemberList.tsx`
- **Thay đổi cụ thể:**
  - Thay thế spinner toàn màn hình bằng:
    - Ở List: Giữ nguyên toolbar, hiển thị 6–8 Skeleton Cards với hiệu ứng shimmer nhẹ khi đang chuyển trang hoặc áp bộ lọc.
    - Ở Tree/Mindmap: Giữ nguyên khung canvas, chỉ hiển thị spinner nhỏ tại đúng node đang tải thêm con cháu.
- **Lý do:**
  - Loại bỏ hoàn toàn cảm giác "đứng hình", người dùng vẫn có thể tương tác với thanh công cụ mà không bị khóa màn hình.
- **Kỳ vọng cải thiện:**
  - Perceived Performance (Cảm nhận tốc độ của người dùng) tăng vọt.
- **Rủi ro:**
  - Không có.
- **Kế hoạch Test:**
  - Thử nghiệm trên mạng chậm (Fast 3G mô phỏng) xem Skeleton và Node Spinner có mượt mà không.

---

### NHÓM P2: NÂNG CAO & QUY MÔ CỰC LỚN (SCALE 100K+)

#### Task P2.1: PostgreSQL Stored Procedure / Recursive CTE cho Subtree
- **Mục tiêu:**
  - Viết hàm SQL `get_genealogy_subtree(p_root_id UUID, p_max_depth INT)` chạy trực tiếp trong PostgreSQL bằng `WITH RECURSIVE` để lấy toàn bộ các đời con cháu và dâu rể trong đúng 1 query SQL duy nhất, trả về cấu trúc JSON trực tiếp từ DB.
- **Kỳ vọng:**
  - Subtree traversal 5 thế hệ hoàn thành trong < 8ms.

#### Task P2.2: Web Worker Tính Toán Vị Trí (Chỉ khi chứng minh CPU-bound)
- **Mục tiêu:**
  - Nếu số node hiển thị đồng thời vượt quá 1.000 nodes và gây trễ main thread > 50ms, đưa hàm `buildAdjacencyLists` và layout coordinate calculation vào một Web Worker chạy nền.

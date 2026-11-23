# KIẾN TRÚC DỮ LIỆU & LUỒNG TẢI TRANG /dashboard/members
**Dự án:** Tộc Phạm Phú (`giapha-os`)  
**Tài liệu:** So sánh Data Flow Hiện Tại (Current) vs Kiến Trúc Tối Ưu (Optimized)

---

## 1. Kiến Trúc Hiện Tại (Current Architecture) - "LOAD EVERYTHING ANTI-PATTERN"

Hệ thống hiện tại coi toàn bộ gia phả như một văn bản JSON nguyên khối (Monolithic Array). Mỗi khi chuyển view hoặc tải cây, server phải tải 100% cơ sở dữ liệu về bộ nhớ và đẩy toàn bộ xuống trình duyệt.

```mermaid
flowchart TD
    subgraph ClientBrowser [Trình Duyệt Người Dùng]
        UserAction[Người dùng đổi tab: List -> Tree/Mindmap]
        RouterPush[router.push '?view=tree&rootId=...']
        Spinner[Hiển thị Spinner toàn màn hình: 'Đang tải dữ liệu...']
        RSCParse[Browser nhận RSC Payload cực lớn: Phải giải mã vài MB JSON]
        AdjacencyCompute[Client tính toán: buildAdjacencyLists lặp qua toàn bộ dữ liệu O(N)]
        DOMRender[Render toàn bộ DOM cây gia phả: Hàng ngàn thẻ DOM được gắn vào]
    end

    subgraph NextServer [Next.js App Router Server Component]
        PageRender[app/dashboard/members/page.tsx: FamilyTreePage]
        CountDB[Supabase Count: count persons & count relationships]
        ParallelBatches[Promise.all: Bắn song song N requests x 1000 rows]
        MemoryAggregate[Gộp hàng chục ngàn records vào bộ nhớ RAM Node.js]
        RSCEmit[Serialize mảng persons + relationships vào React Flight Stream]
    end

    subgraph PostgreSQL [Supabase PostgreSQL Database]
        PersonsTable[(Bảng: persons)]
        RelsTable[(Bảng: relationships)]
    end

    UserAction --> RouterPush
    RouterPush --> Spinner
    RouterPush --> PageRender
    PageRender --> CountDB
    CountDB --> PersonsTable
    CountDB --> RelsTable
    PageRender --> ParallelBatches
    ParallelBatches -->|SELECT * FROM persons LIMIT 1000 OFFSET 0...| PersonsTable
    ParallelBatches -->|SELECT * FROM relationships LIMIT 1000 OFFSET 0...| RelsTable
    ParallelBatches --> MemoryAggregate
    MemoryAggregate --> RSCEmit
    RSCEmit -->|Payload RSC vài MB qua Network| RSCParse
    RSCParse --> AdjacencyCompute
    AdjacencyCompute --> DOMRender
    DOMRender -->|Kết thúc loading, tắt spinner| ClientBrowser
```

### Điểm Nghẽn Chính:
1. **Network Overhead:** RSC Stream phải tải hàng ngàn object gồm cả `note`, `address`, `phone` dù Tree/Mindmap chỉ cần tên, năm sinh, ảnh.
2. **Server Memory Pressure:** Node.js server phải chứa và serialize toàn bộ danh sách thành viên cùng lúc.
3. **Main Thread Lock:** Trình duyệt đơ cứng trong quá trình parse chuỗi JSON lớn và chạy `buildAdjacencyLists`.
4. **Không Có Cache:** Mỗi lần user chuyển từ `list` sang `tree` hoặc `mindmap`, toàn bộ quy trình trên lặp lại 100%.

---

## 2. Kiến Trúc Tối Ưu Đề Xuất (Optimized Architecture) - "PROGRESSIVE GRAPH & TARGETED CACHE"

Hệ thống mới phân định rõ ràng trách nhiệm:
- **List View:** Chỉ tải đúng 24 records của trang hiện tại với các cột tối thiểu (`SELECT id, full_name, gender, birth_year...`).
- **Tree & Mindmap View:** Chỉ tải **Root + 2 thế hệ con cháu kế cận (F1 + F2)**. Khi người dùng bấm mở rộng node con nào, một request nhẹ (`/api/genealogy/subtree?rootId=...&depth=1`) sẽ tải đúng phần cây con đó và chắp nối vào đồ thị cục bộ.
- **Client Cache Tầng 1 (In-Memory Graph Store):** Dữ liệu của từng node/subtree đã tải được ghi nhớ trong bộ nhớ RAM trình duyệt. Chuyển tab giữa List / Tree / Mindmap phản hồi tức thời (< 16ms), không bắn lại request dư thừa.

```mermaid
flowchart TD
    subgraph ClientLayer [Trình Duyệt: Progressive Client Engine]
        UIAction[Người dùng tương tác: Đổi tab hoặc Click Expand Node (+)]
        GraphCacheCheck{Node/Subtree đã có trong Client Cache?}
        InstantRender[Hiển thị TỨC THÌ từ Cache: 0ms Network, 60fps Animation]
        FetchSubtree[Gọi API Subtree theo yêu cầu: /api/genealogy/subtree]
        LocalNodeLoader[Chỉ hiển thị hiệu ứng Loading nhỏ tại đúng Node bấm (+)]
        PatchGraph[Chắp nối Node/Edge mới vào Đồ thị cục bộ & Ghi vào Cache]
    end

    subgraph APILayer [Next.js Edge / Node API Route]
        SubtreeEndpoint[GET /api/genealogy/subtree?rootId=...&depth=2]
        ListEndpoint[GET /dashboard/members?listPage=... Chỉ lấy 24 rows tối thiểu]
        FastTrigramSearch[GET /api/members/search?q=... Trigram GIN Index]
    end

    subgraph DBLayer [PostgreSQL / Supabase]
        CTEQuery[Truy vấn Đệ quy WITH RECURSIVE hoặc Adjacency Fetch theo Depth: < 15ms]
        ListCoverScan[Index-Only Scan trên idx_persons_list_cover: < 5ms]
        TrigramScan[Bitmap Index Scan trên idx_persons_name_search_trgm: < 10ms]
    end

    UIAction --> GraphCacheCheck
    GraphCacheCheck -- CÓ (Hit) --> InstantRender
    GraphCacheCheck -- CHƯA (Miss) --> LocalNodeLoader
    LocalNodeLoader --> FetchSubtree
    FetchSubtree --> SubtreeEndpoint
    SubtreeEndpoint --> CTEQuery
    CTEQuery --> DBLayer
    CTEQuery --> PatchGraph
    PatchGraph --> InstantRender

    UIAction -.->|Xem danh sách| ListEndpoint
    ListEndpoint --> ListCoverScan
    UIAction -.->|Tìm kiếm gõ tên| FastTrigramSearch
    FastTrigramSearch --> TrigramScan
```

---

## 3. So Sánh Chỉ Số Kỹ Thuật (Data Flow Metrics)

| Tiêu Chí | Kiến Trúc Cũ (Current) | Kiến Trúc Mới (Optimized) | Mức Cải Thiện |
|---|---|---|---|
| **Dung lượng Payload (Tree/Mindmap)** | ~1.5 MB – 15 MB (toàn bộ dòng họ) | ~8 KB – 25 KB (chỉ root + 2 đời) | **Giảm 95% – 99%** |
| **Dung lượng Payload (Mỗi trang List)** | ~250 KB – 1.8 MB (`select *` cả note) | ~18 KB – 32 KB (chỉ field hiển thị) | **Giảm 85% – 90%** |
| **Số lượng DOM Nodes vẽ lần đầu** | 1.000 – 10.000 nodes (đệ quy toàn bộ) | 20 – 60 nodes (chỉ các node đang mở) | **Giảm 95% DOM thrashing** |
| **Chuyển Tab (List <-> Tree <-> Mindmap)** | Re-fetch toàn bộ DB, chờ 1.5s – 3.0s | Đọc lại từ Client Cache, phản hồi < 50ms | **Gần như tức thời** |
| **Thời gian khóa Main Thread (CPU Lock)** | 180ms – 650ms (chạy `buildAdjacencyLists` trên 4k rows) | < 5ms (chỉ xử lý subtree cục bộ) | **Hoàn toàn mượt mà 60fps** |
| **Khả năng mở rộng (Scale Ceiling)** | Giới hạn ở vài nghìn người do RAM/DOM | Hỗ trợ 100.000+ người vì chia nhỏ theo bán kính truy vấn | **Không giới hạn quy mô** |

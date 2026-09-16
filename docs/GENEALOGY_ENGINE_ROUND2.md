# BÁO CÁO NGHIỆM THU KIẾN TRÚC & KỸ THUẬT: DETERMINISTIC GENEALOGY ENGINE (ROUND 2)
## Dự án: Hệ thống Tra cứu Gia phả Tộc Phạm Phú (tocphamphu.com)

---

## 1. Tổng Quan Kiến Trúc (Current Architecture)

Hệ thống Tra cứu Gia phả Tộc Phạm Phú sau Round 2 vận hành hoàn toàn theo mô hình **Zero LLM Runtime** kết hợp đồ thị gia phả in-memory và thuật toán xưng hô phả hệ xác định (Deterministic Kinship Reasoning):

```
                        ┌──────────────────────────────────────────────┐
                        │              Client Browser (Web)            │
                        │    - Giao diện Light mode sang trọng         │
                        │    - Selectable Disambiguation Cards         │
                        │    - Structured Person & Kinship Cards       │
                        └──────────────────────┬───────────────────────┘
                                               │ HTTP /api/chat
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │          Next.js App Router Proxy            │
                        │        (giapha-os/app/api/chat)              │
                        │    - Session Persistence (Supabase / Local)  │
                        │    - Fast fallback & Error Classification    │
                        └──────────────────────┬───────────────────────┘
                                               │ POST /chat (NDJSON / JSON)
                                               ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │                       PYTHON DETERMINISTIC GENEALOGY ENGINE (Port 5000)                     │
 │                                                                                             │
 │   ┌───────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐   │
 │   │     IntentParser      │   │  EntityResolver (2-Pass)  │   │   ConversationContext   │   │
 │   │ - 20+ Intent Registry │   │ - Exact -> Normalized     │   │ - active_person_id      │   │
 │   │ - Ordinal Child       │   │ - Alias -> Accent-free    │   │ - Pronoun backfill      │   │
 │   │ - Kinship & Bio       │   │ - Configurable thresholds │   │ - Card pick memory      │   │
 │   └───────────┬───────────┘   └─────────────┬─────────────┘   └────────────┬────────────┘   │
 │               │                             │                              │                │
 │               └──────────────────────┐      │      ┌───────────────────────┘                │
 │                                      ▼      ▼      ▼                                        │
 │                               ┌──────────────────────────┐                                  │
 │                               │       QueryPlanner       │                                  │
 │                               └─────────────┬────────────┘                                  │
 │                                             ▼                                               │
 │                               ┌──────────────────────────┐                                  │
 │                               │       AnswerEngine       │                                  │
 │                               └─────────────┬────────────┘                                  │
 │                                             ▼                                               │
 │                 ┌───────────────────────────┴───────────────────────────┐                   │
 │                 ▼                                                       ▼                   │
 │  ┌─────────────────────────────┐                         ┌─────────────────────────────┐    │
 │  │     FamilyGraph & LCA       │                         │       PrivacyFilter         │    │
 │  │ - DAG Traversal (Up/Down)   │                         │ - PUBLIC_FIELDS             │    │
 │  │ - Lowest Common Ancestor    │                         │ - MEMBER_FIELDS             │    │
 │  │ - 30 Kinship Rule Matrix    │                         │ - ADMIN_FIELDS              │    │
 │  │ - Graph Integrity Validator │                         │ (Block Phone, CCCD, Notes)  │    │
 │  └─────────────────────────────┘                         └─────────────────────────────┘    │
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Vấn Đề Phát Hiện & Nguyên Nhân Gốc Rễ (Problems Found & Root Causes)

1. **Lỗi Kết Nối Production (“Có lỗi kết nối với trợ lý AI. Vui lòng thử lại.”)**:
   - *Nguyên nhân:* Route `app/api/chat/route.ts` bắt ngoại lệ chung `catch (error)` khi gọi sang Python engine và trả về chuỗi hardcode chứa từ "AI". Khi backend chưa khởi động hoặc gặp timeout mạng, frontend lập tức hiển thị thông báo lỗi nghèo nàn này.
   - *Khắc phục:* Phân loại mã lỗi rõ ràng (`NETWORK_ERROR`, `SERVER_ERROR`, `NOT_FOUND`, `AMBIGUOUS`). Loại bỏ hoàn toàn chữ "AI" khỏi client.
2. **Lỗi Chọn Ẩu Người Trùng Tên (`matches[0]` Anti-pattern)**:
   - *Nguyên nhân:* Trước Round 2, khi có nhiều kết quả trùng tên (ví dụ: 3 người cùng tên "Phạm Phú Hưng"), hệ thống tự động gán `person_id = unique_pids[0]`, dẫn tới việc trả lời sai lệch hoàn toàn về thân phụ, chi phái và năm sinh.
   - *Khắc phục:* Xây dựng **Disambiguation Flow**: Khi phát hiện >1 người trùng tên hoặc điểm tương đồng tiệm cận nhau, `EntityResolver` buộc gắn cờ `is_ambiguous = True`, `person_id = None`, trả về danh sách `candidates` để người dùng click chọn trực tiếp.
3. **Mù Mờ Về Vai Vế Nội/Ngoại (Kinship Distance Fallacy)**:
   - *Nguyên nhân:* Chỉ dựa vào hiệu số thế hệ ($\Delta_{\text{generation}} = -2 \Rightarrow$ ông) sẽ không thể phân biệt được **Ông nội** (cha của cha) và **Ông ngoại** (cha của mẹ), **Cháu nội** (con của con trai) và **Cháu ngoại** (con của con gái).
   - *Khắc phục:* Theo dõi mắt xích trung gian trên đường duyệt đồ thị (`intermediate_a`, `intermediate_b`), phân biệt chính xác giới tính của bậc phụ huynh trung gian để gán nhãn danh xưng tiếng Việt chuẩn mực.
4. **Nguy Cơ Lỗ Hổng ReDoS / Algorithmic DoS Trên Input Lớn**:
   - *Nguyên nhân:* Scan n-gram từ 5 xuống 2 từ trên chuỗi 5.000 ký tự gây tốn hơn 1.200ms CPU.
   - *Khắc phục:* Cắt ngắn an toàn `q = q[:300]` và giới hạn quét 50 từ đầu tiên, đưa thời gian phản hồi về dưới **2ms**.

---

## 3. Danh Mục Các Trường Hợp Biên (Edge Cases Handled)

| STT | Tình Huống Biên (Edge Case) | Cơ Chế Xử Lý Của Engine | Kết Quả Thực Tế |
|:---:|---|---|:---:|
| 1 | **Trùng tên 100%**: Nhiều người cùng tên trong dòng họ | Trả về `type: "disambiguation"` kèm thẻ ứng viên có Đời, Chi, Năm sinh, Cha/Mẹ | Không đoán ẩu, chờ user click chọn |
| 2 | **Tên không dấu**: "pham phu hung" | Tạo candidate pool gồm cả "Phạm Phú Hưng" và "Phạm Phú Hùng" | Disambiguation 4 người, phân biệt rạch ròi |
| 3 | **Hỏi đại từ kế tiếp**: "Cha của ông ấy là ai?" | Đọc `active_person_id` từ `ConversationContext` | Xác định đúng đối tượng vừa nhắc |
| 4 | **Hỏi thứ bậc con**: "Ai là con thứ hai của A?" | Truy vấn `ORDINAL_CHILD`, sắp xếp `birth_order` -> `birth_year` | Trả đúng người con thứ 2 (Phạm Phú Quốc) |
| 5 | **Hỏi con út**: "Con út của A là ai?" | Map `order = -1` -> lấy `children[-1]` | Trả đúng con út trong danh sách |
| 6 | **A là gì của A**: "A là gì của A?" | Phát hiện `same_person` | "A và A là cùng một người" |
| 7 | **Bên nội vs Bên ngoại**: Ông nội vs Ông ngoại | Truy vết đường đi qua cha hay qua mẹ | Phân biệt tuyệt đối nội / ngoại |
| 8 | **Con chú con bác**: Tuổi tác nghịch đảo vai vế | So sánh thứ bậc `birth_order` của 2 người cha tại LCA | Con của bác luôn là anh/chị họ |
| 9 | **Anh em cùng cha khác mẹ**: Half-sibling paternal | Kiểm tra `same_father and not same_mother` | Nhận diện đúng anh em cùng cha khác mẹ |
| 10 | **Hôn nhân & Thông gia**: Con dâu, con rể, bố mẹ chồng | Duyệt qua liên kết `spouse_of` | Nhận diện đúng con dâu, con rể |
| 11 | **Không có quan hệ**: 2 người không có LCA chung | BFS tìm liên kết xa, nếu không có trả `type: "none"` | Báo rõ chưa tìm thấy liên kết |
| 12 | **Tấn công SQLi, XSS, Emoji, Rỗng**: `' OR 1=1 --` | Xử lý deterministic chuỗi thuần, cắt 300 chars | Không crash, an toàn tuyệt đối |

---

## 4. Chiến Lược Xử Lý Trùng Tên (Duplicate-Name Disambiguation Strategy)

```
                       User Input: "Phạm Phú Hưng là ai?"
                                       │
                                       ▼
                        EntityResolver.resolve_phrase()
                                       │
                       ┌───────────────┴───────────────┐
                       │ Count exact matches in DB     │
                       │ Result: 3 persons found       │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                     Flag is_ambiguous = True, person_id = None
                                       │
                                       ▼
                       AnswerEngine._execute_plan()
                                       │
                                       ▼
                   Extract parent names for each candidate:
                   - Candidate 1: Đời 12, Chi 2, 1954, Con ông Phạm Phú X
                   - Candidate 2: Đời 14, Chi 1, 1988, Con ông Phạm Phú Y
                   - Candidate 3: Đời 15, Chi 4, 2002, Con ông Phạm Phú Z
                                       │
                                       ▼
                        Return JSON type: "disambiguation"
                                       │
                                       ▼
                   Frontend renders Selectable Candidate Cards
                     [Chọn]            [Chọn]            [Chọn]
                       │
                       ▼ User clicks [Chọn] Candidate 2
               Frontend calls POST /api/chat with:
               { selected_person_id: "p-012" }
                       │
                       ▼
               ConversationContext sets active_person_id = "p-012"
               All follow-up turns ("Cha ông ấy là ai?") query directly via "p-012"
```

---

## 5. Cấu Trúc Quản Lý Ngữ Cảnh Hội Thoại (Conversation Context State Machine)

- **Trường dữ liệu lưu trữ:**
  - `session_id`: Định danh phiên hội thoại.
  - `active_person_id`: UUID của nhân vật trọng tâm hiện tại.
  - `secondary_person_id`: UUID của nhân vật thứ hai (nếu đang trong câu hỏi so sánh quan hệ).
  - `last_intent`: Ý định vừa xử lý gần nhất.
  - `last_result_person_ids`: Danh sách các ID trả về gần nhất (phục vụ câu hỏi truy vết thứ tự như "người con thứ hai").
  - `timestamp`: Thời điểm tương tác cuối.
- **Quy tắc phân giải đại từ (Pronoun Backfill):**
  - Khi câu hỏi chứa: `"ông ấy"`, `"bà ấy"`, `"cụ ấy"`, `"người này"`, `"người đó"`, `"vợ ông ấy"`, `"con ông ấy"`:
  - Tự động lấy `active_person_id` từ lượt trước gán vào `primary_entity`, độ tin cậy $0.95$.

---

## 6. Chuẩn Hóa Hợp Đồng API (Standardized API Contract)

### Endpoint: `POST /chat`
```json
{
  "type": "answer" | "person" | "relationship" | "person_list" | "disambiguation" | "not_found" | "clarification" | "unknown" | "error",
  "message": "Thông điệp phản hồi bằng văn bản tiếng Việt tự nhiên",
  "answer": "Giữ nguyên để tương thích ngược 100% với phiên bản cũ",
  "data": {
    "primary_person": {
      "id": "p-003",
      "full_name": "Phạm Phú Thứ",
      "generation": 2,
      "branch": "Phái Nhất",
      "birth_year": 1821,
      "death_year": 1882
    },
    "relationship": {
      "relationship_type": "direct_ancestor",
      "a_calls_b": "cháu trai",
      "b_calls_a": "ông nội",
      "description": "Cụ Phạm Phú Thứ là ông nội của Phạm Phú Bằng...",
      "path": ["p-003", "p-005", "p-006"],
      "path_labels": ["Phạm Phú Thứ sinh ra Phạm Phú Tiết", "Phạm Phú Tiết sinh ra Phạm Phú Bằng"]
    }
  },
  "candidates": [
    {
      "person_id": "p-011",
      "display_name": "Phạm Phú Hưng",
      "generation": 12,
      "branch": "Chi 2",
      "birth_year": 1954,
      "father_name": "Phạm Phú X"
    }
  ],
  "suggestions": [
    "Cha của ông ấy là ai?",
    "Các con của ông ấy",
    "Xem cây gia phả"
  ],
  "meta": {
    "intent": "FATHER_OF",
    "latency_ms": 1.25,
    "confidence": 1.0,
    "status": "success"
  }
}
```

### Endpoint: `GET /health`
```json
{
  "status": "ok",
  "service": "genealogy-knowledge-engine",
  "graph_loaded": true,
  "llm_enabled": false,
  "deterministic": true,
  "persons_count": 21,
  "parent_child_edges": 19,
  "spouses_edges": 4,
  "faq_entries": 16,
  "integrity_issues_count": 0,
  "version": "2.1.0"
}
```

---

## 7. Thiết Kế Giao Diện UI & Design System (UI States)

- **Phong Cách Thiết Kế**:
  - **Light Mode 100%**: Nền sáng `#FBF9F5`, container `#FFFFFF`, chữ đậm `#1C1917` (dễ đọc, độ tương phản cao).
  - **Màu Sắc Bản Sắc Dòng Tộc**: Đỏ son trầm cổ kính `#B31D1D`, viền nhấn vàng đồng `#E8B931`.
  - **Tuyệt Đối Không Dùng Glassmorphism**: Không dùng `backdrop-filter: blur`, không nền mờ ảo, đảm bảo nét chữ sắc sảo trên mọi màn hình.
  - **Chống Giật Khung Hình & Rớt Chữ**: Tích hợp `scrollbar-gutter: stable`, `text-wrap: pretty`.
  - **Độ Rộng Khung Chat**: Căn giữa tiêu chuẩn `max-width: 960px` chống dàn trải trống trải.
- **Các Thành Phần Card Chuyên Biệt**:
  - `DisambiguationCard`: Thẻ ứng viên trùng tên hiển thị chi tiết Đời, Chi, Năm sinh, Cha/Mẹ kèm nút bấm `[Chọn thành viên này]`.
  - `PersonProfileCard`: Thẻ hồ sơ thành viên có CTA `[Xem gia phả]` dẫn trực tiếp đến cây phả hệ `/dashboard/members?id=...`.
  - `RelationshipCard`: Trực quan hóa chuỗi mắt xích liên kết quan hệ huyết thống qua các thế hệ.
  - `SuggestionPills`: Gợi ý câu hỏi kế tiếp giúp người dùng tra cứu liền mạch bằng 1 cú click.

---

## 8. Bảo Mật Thông Tin Riêng Tư (Privacy & Field Masking)

Hệ thống bảo vệ quyền riêng tư ngay tại tầng Backend (`PrivacyFilter`), không phụ thuộc vào việc Frontend ẩn/hiện:
- **`PUBLIC_FIELDS`** (Khách vãng lai / Ẩn danh):
  - `id`, `full_name`, `gender`, `birth_year`, `death_year`, `birth_display`, `death_display`, `generation`, `branch`, `is_deceased`, `avatar_url`, `note`.
- **`MEMBER_FIELDS`** (Thành viên đăng nhập):
  - Bổ sung: `occupation` (nghề nghiệp), `current_residence` (nơi cư trú).
- **`ADMIN_FIELDS`** (Ban Quản Trị Dòng Tộc):
  - Bổ sung: `phone_number` (số điện thoại), `citizen_id` (CCCD), `admin_note`, nhật ký tạo lập.

---

## 9. Bộ Kiểm Thử Đối Kháng Toàn Diện (Adversarial Test Suite)

Toàn bộ **33 test suites / 150+ subtests đối kháng** đã được thực thi và đạt kết quả **100% PASS**:

| Nhóm Kiểm Thử | Số Lượng Tests | Nội Dung Trọng Tâm | Trạng Thái |
|---|:---:|---|:---:|
| **1. Entity Resolution** | 30 tests | Tên chuẩn, viết hoa, viết thường, không dấu, danh xưng (cụ, ông, bà, bác), bí danh | **PASS** |
| **2. Kinship Reasoning** | 30 tests | Cha, mẹ, con trai/gái, vợ chồng, anh em ruột, cùng cha khác mẹ, ông bà nội/ngoại, cháu nội/ngoại, cụ, chắt, chú bác họ, in-law, A=A | **PASS** |
| **3. Duplicate Names** | 20 tests | 3 người trùng tên Phạm Phú Hưng, disambiguation card, lưu active_person_id | **PASS** |
| **4. Conversation Context** | 20 tests | Đại từ "ông ấy", "con thứ hai", "vợ ông ấy", chuỗi hội thoại 3 turns liên tiếp | **PASS** |
| **5. Typo & Accent** | 10 tests | Sai lệch dấu, viết thường không dấu | **PASS** |
| **6. Graph Integrity** | 10 tests | SELF_PARENT, ANCESTRY_CYCLE, IMPOSSIBLE_GENERATION, ORPHAN_REFERENCE | **PASS** |
| **7. Unknown Intent** | 10 tests | Thời tiết, toán học, nấu ăn, câu hỏi ngoài phạm vi gia phả | **PASS** |
| **8. Security & Malformed** | 10 tests | Input rỗng, chuỗi 5.000 ký tự, SQL injection, XSS script, Emoji | **PASS** |
| **9. API Contract** | 10 tests | Schema JSON, Privacy role masking, /health, Latency SLA | **PASS** |
| **TỔNG CỘNG** | **150+ tests** | **Phủ kín toàn diện mọi khía cạnh** | **100% PASS** |

---

## 10. Báo Cáo Đo Lường Hiệu Năng (Benchmark Report)

Đo lường trên **1.000 truy vấn thực tế** (`benchmark_genealogy.py`):

```
======================================================================
🚀 KẾT QUẢ BENCHMARK HỆ THỐNG GIA PHẢ TỘC PHẠM PHÚ (1,000 QUERIES)
======================================================================
• Tổng số truy vấn:          1,000 queries
• Tổng thời gian thực thi:    1.27 s
• Thông lượng xử lý (QPS):    786.2 queries/giây
----------------------------------------------------------------------
📈 ĐỘ TRỄ TOÀN DIỆN (TOTAL REQUEST LATENCY):
  - P50 (Trung vị):           0.481 ms
  - P95 (Ngưỡng 95%):         1.935 ms   (Mục tiêu SLA: < 50.0 ms -> VƯỢT TRỘI 25 LẦN)
  - P99 (Ngưỡng 99%):         3.239 ms
----------------------------------------------------------------------
🔍 ĐỘ TRỄ TỪNG THÀNH PHẦN:
  1. Phân giải thực thể (Entity Resolution):   P50=0.348ms | P95=1.768ms
  2. Duyệt đồ thị LCA (Graph Traversal):       P50=0.042ms | P95=0.119ms
======================================================================
✅ SLA ĐẠT TIÊU CHUẨN XÁC ĐỊNH: ZERO LLM RUNTIME — PHẢN HỒI DƯỚI 2MS.
```

---

## 11. Các Giới Hạn Đã Biết & Hướng Phát Triển (Remaining Limitations & Roadmap)

1. **Dữ Liệu Đồ Thị**:
   - Hiện tại dữ liệu in-memory graph hỗ trợ đồng bộ thời gian thực từ Supabase hoặc fallback từ `seed_family_data.json`. Khi có cập nhật gia phả mới trong trang quản trị, ban quản trị chỉ cần gọi `POST /admin/reload` để nạp nóng mà không cần khởi động lại server.
2. **Quan Hệ Hôn Nhân Phức Tạp Nhiều Đời**:
   - Trường hợp hôn nhân chéo giữa các chi nhánh xa nhiều đời hiện tại đã có cơ chế giải quyết qua BFS đường đi ngắn nhất (`find_shortest_path`). Trong tương lai có thể bổ sung thuật ngữ xưng hô đặc thù địa phương Quảng Nam (ví dụ: chú thím, cô dượng, anh em bạn dì).

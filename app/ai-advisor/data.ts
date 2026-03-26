/**
 * AI Advisor — FAQ chips with pre-written answers.
 * Clicking a chip shows the answer instantly without calling the AI.
 *
 * To add a new FAQ: append a new entry to FAQ_CHIPS below.
 */

export interface FaqChip {
  /** Short label shown on the chip button */
  label: string;
  /** Full question displayed as the user message */
  question: string;
  /** Pre-written answer displayed as the AI message */
  answer: string;
}

export const FAQ_CHIPS: FaqChip[] = [
  {
    label: "Sứ mệnh của trang web này là gì?",
    question: "Sứ mệnh của trang web này là gì?",
    answer: `Trang web **Tộc Phạm Phú** được xây dựng với sứ mệnh lưu giữ và kết nối lịch sử dòng họ Phạm Phú qua nhiều thế hệ.

- **Bảo tồn cội nguồn**: Ghi chép và lưu trữ thông tin về hơn 2.000 thành viên trải dài 13 thế hệ.
- **Kết nối thế hệ**: Giúp các thành viên trong và ngoài nước tìm về cội nguồn, nhận ra quan hệ huyết thống.
- **Giáo dục lịch sử**: Chia sẻ những câu chuyện, sự kiện và giá trị văn hóa của dòng họ Phạm Phú.
- **Công nghệ phục vụ truyền thống**: Ứng dụng công nghệ hiện đại để gia phả luôn sống động và dễ tiếp cận.

"Cây có gốc mới nở cành xanh ngọn, nước có nguồn mới bể rộng sông sâu."`,
  },
  {
    label: "Tôi có thể dùng trang này như thế nào?",
    question: "Tôi có thể sử dụng trang web này như thế nào?",
    answer: `Trang web **Tộc Phạm Phú** cung cấp nhiều tính năng dành cho thành viên:

- **Gia phả**: Xem danh sách và hồ sơ chi tiết của từng thành viên trong dòng họ.
- **Cây phả hệ**: Khám phá mối quan hệ giữa các thành viên qua sơ đồ cây trực quan.
- **Tra cứu quan hệ**: Tìm hiểu mối quan hệ huyết thống giữa hai bất kỳ thành viên nào.
- **Thư viện ảnh**: Xem bộ sưu tập hình ảnh lịch sử của dòng họ.
- **Sự kiện & Giỗ họ**: Theo dõi các ngày kỷ niệm và sự kiện quan trọng.
- **Trợ lý AI**: Hỏi đáp tự nhiên về bất kỳ thành viên hay câu hỏi nào liên quan đến dòng họ.

Để bắt đầu, hãy đăng nhập và khám phá phần **Gia phả** hoặc đặt câu hỏi cho tôi!`,
  },
  {
    label: "Thông tin cá nhân có được bảo mật không?",
    question: "Thông tin cá nhân và dữ liệu gia phả có được bảo mật không?",
    answer: `Chúng tôi coi trọng sự riêng tư của mọi thành viên. Các cam kết bảo mật bao gồm:

- **Kiểm soát truy cập**: Chỉ thành viên đã được quản trị viên phê duyệt mới có thể xem thông tin gia phả.
- **Mã hóa dữ liệu**: Toàn bộ dữ liệu được lưu trữ và truyền tải qua kết nối bảo mật, được lưu trên cloud server.
- **Không chia sẻ bên thứ ba**: Thông tin dòng họ không được cung cấp cho bất kỳ tổ chức nào bên ngoài gia tộc.
- **Quyền xóa thông tin**: Thành viên có thể liên hệ quản trị viên để yêu cầu chỉnh sửa hoặc xóa thông tin cá nhân.
- **AI an toàn**: Trợ lý AI chỉ truy cập dữ liệu gia phả trong phạm vi được phép; khóa bảo mật AI không bao giờ lộ ra ngoài.`,
  },
  {
    label: "Điều khoản sử dụng là gì?",
    question: "Điều khoản và điều kiện sử dụng trang web là gì?",
    answer: `Khi sử dụng trang web **Tộc Phạm Phú**, bạn đồng ý với các điều khoản sau:

- **Mục đích cá nhân**: Thông tin gia phả chỉ được sử dụng cho mục đích cá nhân và gia đình, không thương mại.
- **Tôn trọng quyền riêng tư**: Không sao chép, chia sẻ hoặc phát tán thông tin cá nhân của thành viên khác ra ngoài.
- **Nội dung chính xác**: Khi đóng góp thông tin, bạn chịu trách nhiệm về tính chính xác của nội dung cung cấp.
- **Không lạm dụng**: Nghiêm cấm sử dụng trang web để quảng cáo, phát tán nội dung không phù hợp hoặc xâm phạm quyền lợi thành viên khác.
- **Tài khoản**: Bạn có trách nhiệm bảo mật thông tin đăng nhập của mình.

Vi phạm điều khoản có thể dẫn đến khóa tài khoản.`,
  },
  {
    label: "Ai được phép xem thông tin gia phả?",
    question: "Ai có quyền xem thông tin gia phả?",
    answer: `Quyền truy cập thông tin được phân cấp như sau:

- **Khách (chưa đăng nhập)**: Chỉ xem được trang giới thiệu, bài viết công khai và thông tin chung về dòng họ.
- **Thành viên đã xác minh**: Sau khi được quản trị viên phê duyệt, có thể xem toàn bộ gia phả, cây phả hệ, thư viện ảnh và sử dụng Trợ lý AI.
- **Quản trị viên**: Có quyền thêm/sửa/xóa thông tin thành viên, phê duyệt tài khoản mới và quản lý nội dung.

Để được cấp quyền truy cập, vui lòng liên hệ trưởng tộc hoặc quản trị viên của dòng họ.`,
  },
  {
    label: "Làm sao để đóng góp thông tin?",
    question: "Làm thế nào để đóng góp hoặc cập nhật thông tin gia phả?",
    answer: `Chúng tôi luôn chào đón sự đóng góp của các thành viên để gia phả ngày càng đầy đủ hơn:

- **Liên hệ quản trị viên**: Gửi thông tin bổ sung (tên, ngày sinh, ảnh, câu chuyện...) cho quản trị viên để cập nhật.
- **Báo lỗi**: Nếu phát hiện thông tin chưa chính xác, hãy thông báo để kịp thời chỉnh sửa.
- **Đóng góp ảnh**: Chia sẻ hình ảnh lịch sử, sự kiện dòng họ để bổ sung vào thư viện.
- **Chia sẻ câu chuyện**: Bổ sung ghi chú, câu chuyện về các thành viên để làm phong phú hồ sơ gia phả.

Mọi đóng góp đều được xét duyệt trước khi hiển thị để đảm bảo tính chính xác.`,
  },
  {
    label: "Trợ lý AI có thể làm gì?",
    question: "Trợ lý AI Tộc Phạm Phú có thể làm những gì?",
    answer: `**Trợ lý AI Tộc Phạm Phú** là công cụ hỏi đáp thông minh được huấn luyện từ dữ liệu dòng họ Phạm Phú. Tôi có thể giúp bạn:

- **Tìm kiếm thành viên**: Tra cứu thông tin về bất kỳ thành viên nào, kể cả khi bạn chỉ nhớ tên hoặc đặc điểm chung.
- **Giải thích quan hệ**: Cho biết mối quan hệ huyết thống giữa hai người trong dòng họ.
- **Lịch sử & câu chuyện**: Kể về các nhân vật nổi bật và sự kiện quan trọng của dòng họ.
- **Giỗ họ & sự kiện**: Nhắc nhở các ngày giỗ, lễ kỷ niệm trong năm.
- **Hỏi đáp tiếng Việt / tiếng Anh**: Tôi hiểu cả hai ngôn ngữ và trả lời bằng ngôn ngữ bạn sử dụng.

Lưu ý: Tôi chỉ trả lời dựa trên dữ liệu gia phả đã có. Với câu hỏi chưa có dữ liệu, tôi sẽ thông báo rõ ràng.`,
  },
  {
    label: "Làm sao để đăng ký tài khoản?",
    question: "Làm thế nào để đăng ký tài khoản trên trang web?",
    answer: `Quy trình đăng ký tài khoản trên **Tộc Phạm Phú** gồm 3 bước:

**Bước 1 — Đăng ký**: Truy cập trang **Đăng nhập / Đăng ký**, điền email và mật khẩu để tạo tài khoản.

**Bước 2 — Chờ xét duyệt**: Do đây là trang dành riêng cho thành viên dòng họ, tài khoản của bạn cần được **Quản trị viên phê duyệt** trước khi truy cập đầy đủ.

**Bước 3 — Bắt đầu khám phá**: Sau khi được kích hoạt, bạn có thể xem gia phả, cây phả hệ và sử dụng Trợ lý AI.

Nếu tài khoản chờ duyệt quá lâu, hãy liên hệ trực tiếp với **trưởng tộc hoặc quản trị viên** để được hỗ trợ.`,
  },
  {
    label: "Liên hệ quán trị viên/trưởng tộc như thế nào?",
    question: "Làm thế nào để liên hệ với trưởng tộc hoặc quản trị viên?",
    answer: `Bạn có thể liên hệ với Ban Quản trị dòng họ Phạm Phú qua các kênh sau:

- **Nhà thờ Tộc Phạm Phú** tại Điện Bàn, Quảng Nam — trung tâm tổ chức các nghi lễ và lưu giữ gia phả gốc.
- **Nhà thờ Tộc Phạm Phú** tại Thủ Đức, TP. Hồ Chí Minh — chi nhánh đại diện phía Nam.
- **Qua trang web**: Sử dụng tính năng liên hệ hoặc nhờ thành viên đã được xác minh giới thiệu với quản trị viên.

Ban Quản trị sẽ hỗ trợ bạn về: phê duyệt tài khoản, cập nhật thông tin gia phả, và các vấn đề liên quan đến dòng họ.`,
  },
  {
    label: "Dữ liệu được lưu ở đâu?",
    question: "Dữ liệu gia phả và tài khoản của tôi được lưu trữ ở đâu?",
    answer: `Toàn bộ dữ liệu của **Tộc Phạm Phú** được lưu trữ an toàn trên nền tảng **Supabase** — một dịch vụ cơ sở dữ liệu đám mây uy tín:

- **Mã hóa toàn phần**: Dữ liệu được mã hóa cả khi lưu trữ lẫn khi truyền tải.
- **Sao lưu định kỳ**: Hệ thống tự động sao lưu để tránh mất mát dữ liệu.
- **Phân quyền chi tiết (RLS)**: Mỗi người dùng chỉ truy cập được đúng phần dữ liệu mình được phép.
- **Máy chủ khu vực Đông Nam Á**: Đảm bảo tốc độ truy cập nhanh cho người dùng tại Việt Nam.

Chúng tôi không lưu trữ mật khẩu dạng văn bản thô — mọi mật khẩu đều được băm (hashed) theo chuẩn bảo mật hiện đại.`,
  },
  {
    label: "Ông Phạm Phú Thứ là ai?",
    question: "Ông Phạm Phú Thứ là ai và vai trò của ông trong lịch sử?",
    answer: `**Phạm Phú Thứ** (1821 – 1882) là một nhân vật lịch sử nổi bật của dòng họ Phạm Phú và của đất nước Việt Nam:

- **Nhà cải cách tiên phong**: Là một trong những quan lại đầu tiên của triều Nguyễn đề xuất canh tân, mở cửa giao lưu với phương Tây.
- **Nhà ngoại giao**: Từng tham gia phái bộ sứ thần sang Pháp và các nước châu Âu (1863), ghi chép lại trong tác phẩm *Tây hành nhật ký*.
- **Nhà văn hóa**: Để lại nhiều tác phẩm thơ văn chữ Hán có giá trị, phản ánh tư tưởng canh tân và tình yêu nước thương dân.
- **Người con của Quảng Nam**: Sinh tại làng Đông Bàn, Điện Bàn — nơi đặt nhà thờ tộc chính của dòng họ Phạm Phú.

Ông là niềm tự hào lớn nhất của dòng họ, được thờ phụng và tôn kính qua nhiều thế hệ.`,
  },
  {
    label: "Các ngày giỗ họ quan trọng?",
    question: "Các ngày giỗ họ và lễ kỷ niệm quan trọng của dòng họ là khi nào?",
    answer: `Dòng họ Phạm Phú có một số ngày lệ quan trọng hàng năm:

- **Giỗ tổ dòng họ**: Ngày lễ lớn nhất, tổ chức tại nhà thờ tộc ở Điện Bàn, Quảng Nam — toàn thể con cháu trong và ngoài nước cùng về tụ họp.
- **Giỗ cụ Phạm Phú Thứ**: Kỷ niệm ngày mất của danh nhân Phạm Phú Thứ (năm 1882), tổ chức long trọng hàng năm.
- **Thanh Minh**: Dòng họ tổ chức tảo mộ tổ tiên theo phong tục truyền thống.
- **Ngày giỗ cá nhân**: Mỗi thành viên trong gia phả đều có ngày giỗ được ghi chép — bạn có thể tra cứu lịch giỗ của từng người qua mục **Sự kiện** trên trang web.

Để xem lịch giỗ đầy đủ, hãy truy cập mục **Sự kiện & Giỗ họ** sau khi đăng nhập.`,
  },
  {
    label: "Trang web có miễn phí không?",
    question: "Việc sử dụng trang web Tộc Phạm Phú có mất phí không?",
    answer: `**Trang web Tộc Phạm Phú hoàn toàn miễn phí** cho tất cả các thành viên trong dòng họ.

- **Không thu phí đăng ký**: Tạo tài khoản và sử dụng tất cả tính năng đều miễn phí.
- **Không quảng cáo**: Trang web không hiển thị quảng cáo thương mại — hoàn toàn phi lợi nhuận.
- **Trợ lý AI miễn phí**: Tính năng hỏi đáp bằng AI cũng không tính thêm bất kỳ chi phí nào.

Trang web được duy trì bởi tâm huyết của các thành viên trong dòng họ, với mục tiêu duy nhất là bảo tồn và kết nối cội nguồn Phạm Phú.`,
  },
  {
    label: "Tôi quên mật khẩu phải làm sao?",
    question: "Tôi quên mật khẩu, làm thế nào để lấy lại tài khoản?",
    answer: `Nếu bạn quên mật khẩu, hãy làm theo các bước sau:

**Bước 1**: Truy cập trang **Đăng nhập**, nhấn vào liên kết **"Quên mật khẩu?"**.

**Bước 2**: Nhập địa chỉ email đã dùng để đăng ký tài khoản.

**Bước 3**: Kiểm tra hộp thư email (kể cả thư mục Spam/Junk) — bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.

**Bước 4**: Nhấn vào liên kết trong email và tạo mật khẩu mới.

Nếu không nhận được email sau 5 phút, vui lòng liên hệ quản trị viên để được hỗ trợ thủ công.`,
  },
];


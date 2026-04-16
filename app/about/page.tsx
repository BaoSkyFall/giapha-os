"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { motion, Variants } from "framer-motion";
import {
  CalendarDays,
  Download,
  Github,
  Mail,
  Network,
  Search,
  ShieldAlert,
  TreePine,
} from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const features = [
  {
    icon: <Network className="size-6" />,
    title: "Cây Gia Phả Tương Tác",
    desc: "Sơ đồ phả hệ trực quan, dễ dàng tra cứu quan hệ huyết thống giữa các đời trong dòng tộc.",
  },
  {
    icon: <Search className="size-6" />,
    title: "Tra Cứu Danh Xưng",
    desc: "Hệ thống gợi ý cách xưng hô chính xác theo thứ bậc trong gia đình và dòng họ.",
  },
  {
    icon: <CalendarDays className="size-6" />,
    title: "Lịch Âm & Ngày Giỗ",
    desc: "Tự động nhắc nhở các ngày kỵ nhật, lễ tết quan trọng của dòng họ hàng năm.",
  },
  {
    icon: <Download className="size-6" />,
    title: "Xuất Dữ Liệu",
    desc: "Hỗ trợ xuất gia phả ra định dạng PDF hoặc hình ảnh chất lượng cao để in ấn.",
  },
];

const timeline = [
  {
    year: "Thế kỷ XVII",
    desc: "Khởi thủy tại vùng Điện Bàn, Quảng Nam",
    align: "right" as const,
  },
  {
    year: "1850 – 1900",
    desc: "Thời kỳ trung hưng, xây dựng tứ đường chính",
    align: "left" as const,
  },
  {
    year: "Hiện nay",
    desc: "Phát triển mạnh mẽ với hơn 4000 thành viên",
    align: "right" as const,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-rice-paper selection:bg-heritage-gold/30 selection:text-heritage-red relative overflow-hidden">
      <Header siteName={config.siteName} />

      {/* Hero */}
      <motion.section
        className="py-20 md:py-28 text-center relative"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
          <TreePine className="size-[350px] text-heritage-red" />
        </div>
        <div className="max-w-[800px] mx-auto px-4 relative z-10">
          <motion.h1
            className="text-5xl md:text-7xl font-serif font-black text-heritage-red leading-tight mb-6"
            variants={fadeIn}
          >
            Về Tộc Phạm Phú
          </motion.h1>
          <motion.p
            className="text-lg text-altar-wood/60 italic leading-relaxed"
            variants={fadeIn}
          >
            &ldquo;Gìn giữ cội nguồn, nối bước cha ông, phát huy giá trị di sản
            văn hóa dòng họ trong thời đại số.&rdquo;
          </motion.p>
        </div>
      </motion.section>

      {/* Mission */}
      <motion.section
        className="py-16 bg-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[1000px] mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div variants={fadeIn}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-10 bg-heritage-red rounded-full" />
              <h2 className="text-3xl font-serif font-bold text-altar-wood">
                Sứ mệnh hiện đại hóa
              </h2>
            </div>
            <p className="text-altar-wood/70 leading-relaxed mb-6">
              Nền tảng{" "}
              <strong className="text-altar-wood">Gia phả Tộc Phạm Phú</strong>{" "}
              được xây dựng với khát khao kết nối các thế hệ, lưu trữ thông tin
              dòng họ một cách khoa học và bền vững. Chúng tôi tin rằng việc hiểu
              rõ nguồn cội là nền tảng vững chắc nhất để mỗi cá nhân phát triển
              và đóng góp cho cộng đồng.
            </p>
            <p className="text-altar-wood/70 leading-relaxed">
              Bằng việc số hóa những trang gia phả giấy đã nhuốm màu thời gian,
              chúng tôi mong muốn lưu giữ trọn vẹn từng câu chuyện, từng kỷ
              niệm của tổ tiên cho con cháu muôn đời sau.
            </p>
          </motion.div>
          <motion.div
            variants={fadeIn}
            className="flex items-center justify-center"
          >
            <div className="w-56 h-56 rounded-full bg-gradient-to-br from-heritage-gold/20 to-heritage-red/10 flex items-center justify-center">
              <TreePine className="size-24 text-heritage-red/30" />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        className="py-16 bg-rice-paper"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[1000px] mx-auto px-4">
          <motion.h2
            className="text-3xl font-serif font-bold text-center text-altar-wood mb-12"
            variants={fadeIn}
          >
            Tính năng nền tảng
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
                className="bg-white p-6 rounded-xl border border-heritage-gold/10 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-heritage-red/10 text-heritage-red rounded-full flex items-center justify-center shrink-0 mt-1">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-altar-wood text-lg mb-1">
                    {f.title}
                  </h3>
                  <p className="text-altar-wood/60 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* History + Timeline */}
      <motion.section
        className="py-16 bg-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[800px] mx-auto px-4">
          <motion.h2
            className="text-3xl font-serif font-bold text-altar-wood mb-6"
            variants={fadeIn}
          >
            Lịch sử Họ Phạm Phú tại Quảng Nam
          </motion.h2>
          <motion.div
            className="text-altar-wood/70 leading-relaxed space-y-4 mb-14"
            variants={fadeIn}
          >
            <p>
              Họ Phạm Phú (范富) khởi tiên nhận họ, đời thứ nhất dựng nghiệp tại
              xã Đông Bàn, huyện Diên Phước, tỉnh Quảng Nam. Nhiều đời nối tiếp,
              tộc họ trở thành một họ lớn của làng. Đến đời thứ ba, dòng họ bắt
              đầu phân thành ba phái: Trưởng phái có nhiều người hiển đạt về văn
              khoa, còn thứ phái có nhiều người nổi bật về võ bị.
            </p>
            <p>
              Theo truyền ngôn của người đương thời, Thỉ tổ vốn là người làng Đốc
              Kỉnh (Kính), huyện Lệ Dương, tỉnh Nghệ An; sau thiên cư đến bổn xã
              để mở rộng môn tộc. Tổ bổn tính trung hậu, lòng dạ nhân hiền, thường
              sẻ chia lợi ích và gánh vác khó khăn cùng mọi người, nên được bậc
              cao niên kính nể, lớp hậu sinh yêu mến.
            </p>
            <p>
              Thỉ tổ sinh hạ ba người con, gồm hai trai và một gái, đều được dạy
              dỗ nghề nghiệp, nối đời cư trú tại xứ Bàn Sơn. Từ đó con cháu ngày
              một đông đúc, được người đương thời khen là một thế gia vọng tộc.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-0.5 h-full w-0.5 bg-heritage-gold/30" />
            {timeline.map((item, idx) => (
              <motion.div
                key={idx}
                className={`relative flex items-center mb-12 last:mb-0 ${item.align === "right" ? "justify-end" : "justify-start"
                  }`}
                variants={fadeIn}
              >
                <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-heritage-red border-4 border-white shadow-sm z-10" />
                <div
                  className={`w-5/12 p-4 rounded-lg border border-heritage-gold/10 bg-rice-paper shadow-sm ${item.align === "right" ? "text-left" : "text-right"
                    }`}
                >
                  <p className="text-heritage-red font-bold text-sm mb-1">
                    {item.year}
                  </p>
                  <p className="text-altar-wood/70 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Privacy */}
      <motion.section
        className="py-16 bg-rice-paper"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[800px] mx-auto px-4">
          <motion.div variants={fadeIn}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-heritage-red/10 text-heritage-red rounded-xl">
                <ShieldAlert className="size-5" />
              </div>
              <h2 className="text-2xl font-bold text-altar-wood">
                Quyền riêng tư và Bảo mật
              </h2>
            </div>

            <div className="bg-white border border-heritage-gold/10 rounded-xl p-6 text-[14.5px] leading-relaxed">
              <ul className="space-y-4 text-altar-wood/70 list-disc pl-5">
                <li>
                  <strong className="text-altar-wood">
                    Bảo mật dữ liệu Tộc Phạm Phú:
                  </strong>{" "}
                  Toàn bộ thông tin gia phả, dữ liệu cá nhân và hình ảnh của
                  các thành viên trong dòng họ được{" "}
                  <strong className="text-altar-wood">
                    lưu trữ an toàn trên hệ thống đám mây
                  </strong>{" "}
                  với mã hóa tiêu chuẩn an toàn thông tin.
                </li>
                <li>
                  <strong className="text-altar-wood">
                    Quyền truy cập hạn chế:
                  </strong>{" "}
                  Chỉ những thành viên được Quản trị viên dòng họ phê duyệt mới
                  có thể xem và yêu cầu chỉnh sửa thông tin gia phả. Người ngoài không
                  thể truy cập dữ liệu của dòng họ.
                </li>
                <li>
                  <strong className="text-altar-wood">
                    Không chia sẻ cho bên thứ ba:
                  </strong>{" "}
                  Thông tin cá nhân và dữ liệu gia đình của bạn không được chia
                  sẻ, bán hoặc cung cấp cho bất kỳ bên thứ ba nào. Dữ liệu chỉ
                  phục vụ mục đích quản lý gia phả của dòng họ.
                </li>
                <li>
                  <strong className="text-altar-wood">
                    Quyền của bạn:
                  </strong>{" "}
                  Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá
                  nhân của mình bằng cách liên hệ <a class="text-heritage-gold font-bold" href="https://www.facebook.com/pham.bao.173130/" target="_blank">Quản trị viên hệ thống</a>.
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Open Source CTA */}
      {/* <motion.section
        className="py-20 bg-white text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[600px] mx-auto px-4">
          <motion.div
            className="inline-flex items-center gap-2 bg-heritage-red/10 text-heritage-red px-4 py-1.5 rounded-full text-sm font-bold mb-4"
            variants={fadeIn}
          >
            <Github className="size-4" />
            GIA PHẢ OPEN SOURCE
          </motion.div>
          <motion.h2
            className="text-3xl font-serif font-bold text-altar-wood mb-4"
            variants={fadeIn}
          >
            Đóng góp cho cộng đồng
          </motion.h2>
          <motion.p
            className="text-altar-wood/60 leading-relaxed mb-8"
            variants={fadeIn}
          >
            Nền tảng của chúng tôi được xây dựng trên mã nguồn mở. Chúng tôi
            khuyến khích mọi lập trình viên trong dòng tộc và cộng đồng cùng
            tham gia cải tiến công cụ để giúp nhiều dòng họ khác cũng có thể số
            hóa gia phả của mình.
          </motion.p>
          <motion.div variants={fadeIn}>
            <a
              href="https://github.com/homielab/giapha-os"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-altar-wood text-white px-8 py-4 rounded-lg font-bold hover:bg-altar-wood/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Github className="size-5" />
              Xem trên GitHub
            </a>
          </motion.div>
          <motion.div className="mt-8" variants={fadeIn}>
            <div className="flex items-center justify-center gap-2 text-altar-wood/50">
              <Mail className="size-4" />
              <span className="text-sm">
                Góp ý hoặc báo lỗi:{" "}
                <a
                  href="mailto:giaphaos@homielab.com"
                  className="text-heritage-red font-semibold hover:underline"
                >
                  giaphaos@homielab.com
                </a>
              </span>
            </div>
          </motion.div>
        </div>
      </motion.section> */}

      <Footer />
    </div>
  );
}

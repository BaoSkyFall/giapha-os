import {
  TreePine,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";

export interface FooterProps {
  className?: string;
  showDisclaimer?: boolean;
}

export default function Footer({
  className = "",
  showDisclaimer = false,
}: FooterProps) {
  return (
    <footer className={`bg-heritage-red text-white py-16 ${className}`}>
      <div className="max-w-[1200px] mx-auto px-4">
        {showDisclaimer && (
          <p className="mb-8 text-xs tracking-wide bg-white/10 inline-block px-3 py-1 rounded-full text-white/80 border border-white/20">
            Nội dung có thể thiếu sót. Vui lòng đóng góp để gia phả chính xác
            hơn.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Family Identity */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <TreePine className="size-7 text-heritage-gold" />
              <h3 className="text-2xl font-serif font-bold">Tộc Phạm Phú</h3>
            </div>
            <p className="text-white/70 leading-relaxed italic">
              &ldquo;Lưu giữ cội nguồn, kết nối thế hệ. Cây có gốc mới nở
              cành xanh ngọn, nước có nguồn mới bể rộng sông sâu.&rdquo;
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-heritage-gold font-bold mb-6 uppercase tracking-wider text-sm">
              Liên kết
            </h4>
            <ul className="space-y-4 text-white/80">
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Cây gia phả
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Lịch sử dòng họ
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Danh nhân
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Tin tức &amp; Sự kiện
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-heritage-gold font-bold mb-6 uppercase tracking-wider text-sm">
              Hỗ trợ
            </h4>
            <ul className="space-y-4 text-white/80">
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Hướng dẫn đăng ký
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Báo cáo lỗi
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Góp ý nội dung
                </a>
              </li>
              <li>
                <a
                  className="hover:text-heritage-gold transition-colors"
                  href="#"
                >
                  Chính sách bảo mật
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-heritage-gold font-bold mb-6 uppercase tracking-wider text-sm">
              Liên hệ
            </h4>
            <ul className="space-y-4 text-white/80">
              <li className="flex items-start gap-3">
                <MapPin className="size-5 text-heritage-gold shrink-0 mt-0.5" />
                <span>Nhà thờ Tộc Phạm Phú, Điện Bàn, Quảng Nam</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-5 text-heritage-gold shrink-0" />
                <span>lienhe@phamphu.vn</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-5 text-heritage-gold shrink-0" />
                <span>0905 123 456</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © 2026 Hội đồng Gia tộc Phạm Phú. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-4 text-white/50 text-sm">
            <a
              href="https://github.com/homielab/giapha-os"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-heritage-gold transition-colors inline-flex items-center gap-1.5"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Tộc Phạm Phú
            </a>
            <span>by</span>
            <a
              href="https://homielab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-heritage-gold transition-colors font-semibold"
            >
              HomieLab
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

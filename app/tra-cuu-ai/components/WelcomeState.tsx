"use client";

import {
  UserSearch,
  GitFork,
  Landmark,
  Calendar,
  ScrollText,
  BarChart3,
} from "lucide-react";

interface ActionCardItem {
  title: string;
  description: string;
  query: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACTION_CARDS: ActionCardItem[] = [
  {
    title: "Tra cứu thành viên",
    description: "Tìm tiểu sử, đời thứ, năm sinh mất và gia đình",
    query: "Cho biết thông tin về cụ Phạm Phú Thứ",
    icon: UserSearch,
  },
  {
    title: "Kiểm tra xưng hô",
    description: "Xác định cách gọi và tổ chung gần nhất giữa hai người",
    query: "Cách xưng hô giữa Phạm Phú Thứ và Phạm Phú Lâm",
    icon: GitFork,
  },
  {
    title: "Nguồn gốc & Lịch sử",
    description: "Tìm hiểu cội nguồn, nhà thờ tộc và danh nhân dòng họ",
    query: "Giới thiệu lịch sử hình thành Tộc Phạm Phú tại Quảng Nam",
    icon: Landmark,
  },
  {
    title: "Ngày giỗ & Sự kiện",
    description: "Tra cứu ngày kỵ nhật, lễ giỗ tổ và sự kiện họ tộc",
    query: "Các ngày giỗ tổ và lễ quan trọng của Tộc Phạm Phú",
    icon: Calendar,
  },
  {
    title: "Thế hệ & Chi phái",
    description: "Xem danh sách các đời, nhánh và hậu duệ tiêu biểu",
    query: "Liệt kê các chi phái chính trong gia phả Tộc Phạm Phú",
    icon: ScrollText,
  },
  {
    title: "Thống kê gia phả",
    description: "Tổng quan số lượng thành viên và độ phủ dữ liệu",
    query: "Thống kê tổng số thành viên theo từng thế hệ",
    icon: BarChart3,
  },
];

interface WelcomeStateProps {
  onSelectQuery: (query: string) => void;
}

export default function WelcomeState({ onSelectQuery }: WelcomeStateProps) {
  return (
    <div className="py-6 sm:py-10 space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/30">
          Không gian tra cứu gia phả chính thức
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#292725] tracking-tight">
          Kính chào quý vị đến với Trợ lý Gia phả Tộc Phạm Phú
        </h2>
        <p className="text-sm sm:text-base text-[#5C5750] leading-relaxed">
          Đặt câu hỏi bằng tiếng Việt tự nhiên để tra cứu thành viên, đối chiếu quan hệ huyết thống, cách xưng hô và tư liệu 13 thế hệ dòng họ.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {ACTION_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onSelectQuery(card.query)}
              className="group text-left bg-[#FFFFFF] border border-[#E8E2D8] hover:border-[#A91E22] rounded-xl p-4 transition-all hover:shadow-sm flex flex-col gap-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-[#FDF2F2] text-[#A91E22] flex items-center justify-center group-hover:bg-[#A91E22] group-hover:text-white transition-colors">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#292725] group-hover:text-[#A91E22] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-[#5C5750] mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

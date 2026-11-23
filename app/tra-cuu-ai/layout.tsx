import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Tra cứu Gia phả | Tộc Phạm Phú",
  description:
    "Không gian tra cứu gia phả thông minh Tộc Phạm Phú — 13 thế hệ, đối chiếu dữ liệu gia phả chính thức.",
};

export default function TraCuuAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full bg-[#FAF8F3] text-[#292725] flex flex-col overflow-hidden overscroll-none">
      {children}
    </div>
  );
}

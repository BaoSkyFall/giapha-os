import Header from "@/components/Header";
import config from "@/app/config";

export const metadata = {
  title: "Trợ lý AI Tộc Phạm Phú",
  description: "Hỏi đáp về thành viên và lịch sử dòng họ",
};

export default function AiAdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh bg-rice-paper flex flex-col overflow-hidden">
      <Header siteName={config.siteName} />
      <main className="h-[calc(100dvh-64px)] flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}


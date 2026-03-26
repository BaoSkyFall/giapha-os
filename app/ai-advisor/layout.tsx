import Footer from "@/components/Footer";
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
    <div className="min-h-screen bg-rice-paper flex flex-col">
      <Header siteName={config.siteName} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}


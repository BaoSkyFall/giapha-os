import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import NavigationProgress from "@/components/NavigationProgress";
import { getUser, getProfile } from "@/utils/supabase/queries";
import config from "./config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
});
export const metadata: Metadata = {
  title: config.siteName,
  description:
    "Tộc Phạm Phú - Gia phả dòng họ Phạm Phú, lưu giữ và kết nối thế hệ.",
  metadataBase: new URL("https://tocphamphu.com"),
  openGraph: {
    title: "Tộc Phạm Phú",
    description:
      "Gia phả dòng họ Phạm Phú - Lưu giữ truyền thống, kết nối thế hệ.",
    url: "https://tocphamphu.com",
    siteName: "Tộc Phạm Phú",
    images: [
      {
        url: "/phamphuthu_1.png",
        width: 828,
        height: 1200,
        alt: "Phạm Phú Thứ",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tộc Phạm Phú",
    description:
      "Gia phả dòng họ Phạm Phú - Lưu giữ truyền thống, kết nối thế hệ.",
    images: ["/phamphuthu_1.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased relative`}
      >
        <AuthProvider user={user} profile={profile}>
          <NavigationProgress />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}


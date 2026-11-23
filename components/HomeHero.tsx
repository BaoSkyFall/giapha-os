"use client";

import BoomerangVideoBg from "@/components/BoomerangVideoBg";
import { Play, Sparkles } from "lucide-react";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";

// Swap to a file in /public once the video is backed up locally.
const BG_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const TREE_HREF = "/dashboard/members";

interface HomeHeroProps {
  readonly siteName: string;
}

export default function HomeHero({ siteName }: HomeHeroProps) {
  return (
    // Subtract the sticky site <Header> height (56px mobile, 60px from sm up).
    <section
      className={`${beVietnamPro.className} relative w-full min-h-[calc(100svh-56px)] sm:min-h-0 sm:h-[calc(100vh-60px)] overflow-hidden bg-[#f3ead8] antialiased`}
    >
      <BoomerangVideoBg src={BG_VIDEO} className="absolute inset-0 w-full h-full" />

      {/* Hero copy */}
      <div className="relative z-10 flex flex-col items-center text-center pt-12 sm:pt-16 md:pt-20 px-4 sm:px-6">
        <h1
          className="font-normal leading-[1.1] text-[#336443] text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4rem] max-w-6xl"
          style={{ letterSpacing: "-0.035em" }}
        >
          Cây có gốc mới nở cành xanh ngọn
          <br />
          <span className="text-[#85AB8B]">Nước có nguồn mới bể rộng sông sâu.</span>
        </h1>
        <p className="mt-6 sm:mt-8 text-[#4b5b47] text-sm sm:text-base md:text-lg leading-relaxed max-w-md px-2">
          Gìn giữ cội nguồn, nối bước cha ông, phát huy giá trị di sản văn hóa dòng họ.
        </p>
      </div>

      {/* Mobile-only scrim so the white CTA copy stays legible over bright frames */}
      <div className="sm:hidden pointer-events-none absolute inset-x-0 bottom-0 z-0 h-72 bg-linear-to-t from-black/55 to-transparent" />

      {/* Bottom-left CTA block */}
      <div className="absolute left-4 right-4 sm:right-auto sm:left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm">
        <div className="flex items-center gap-2 text-white/95 mb-3">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold sm:font-medium">{siteName}</span>
        </div>
        <p className="text-white/85 text-xs leading-relaxed mb-6 max-w-xs">
          Gia phả số giúp con cháu khắp nơi cùng lưu giữ, tra cứu và cập nhật thông tin dòng họ — từ
          sơ đồ phả hệ đến ngày giỗ, lễ tết.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href={TREE_HREF}
            className="bg-white hover:bg-white/90 text-[#1f2a1d] text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-colors shadow-sm"
          >
            Xem gia phả
          </Link>
          <Link
            href="/about"
            className="text-white text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Tìm hiểu thêm.
          </Link>
        </div>
      </div>

      {/* Bottom-right tree link */}
      <Link
        href={TREE_HREF}
        className="group hidden sm:flex absolute right-24 md:right-28 bottom-8 md:bottom-10 z-10 items-center gap-2 text-white/90 text-sm"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
          <Play className="w-3 h-3 fill-white text-white ml-0.5" />
        </span>
        <span className="font-medium">Xem cây gia phả</span>
      </Link>
    </section>
  );
}

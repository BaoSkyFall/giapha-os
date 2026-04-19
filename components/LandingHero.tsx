"use client";

import { FamilyEvent } from "@/utils/eventHelpers";
import { motion, Variants } from "framer-motion";
import { ArrowRight, CalendarDays, Search, TreePine, UserRound } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import Image from "next/image";
import Link from "next/link";
import { Manrope, Playfair_Display } from "next/font/google";
import type { ComponentProps, ElementType } from "react";

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
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};
const playfairVietnamese = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const HERO_PLAYBACK_ID = "02gzwandixH4J534bd00JsCvlFfw6ha101WQ00C9b3sGibM";

const muxBackgroundStyle = {
  "--controls": "none",
  "--media-object-fit": "cover",
  "--media-object-position": "center",
} satisfies NonNullable<ComponentProps<typeof MuxPlayer>["style"]>;

const features = [
  {
    icon: <TreePine className="size-6" />,
    title: "Cây Gia Phả Tương Tác",
    desc: "Sơ đồ phả hệ trực quan, dễ dàng theo dõi huyết thống qua hàng chục thế hệ chỉ với một cú chạm.",
  },
  {
    icon: <Search className="size-6" />,
    title: "Tra Cứu Danh Xưng",
    desc: "Tìm kiếm thông tin và vị trí trong dòng tộc nhanh chóng bằng tên, năm sinh hoặc chi họ.",
  },
  {
    icon: <CalendarDays className="size-6" />,
    title: "Sự Kiện Gia Đình",
    desc: "Cập nhật ngày giỗ, lễ tết và họp mặt dòng họ tự động nhắc nhở theo âm lịch hàng năm.",
  },
];

const ancestors = [
  { name: "Phạm Phú Thứ", years: "1821 – 1882", image: "/phamphuthu_2.png", slug: "pham-phu-thu-nha-canh-tan-tien-phong" },
  { name: "Phạm Phú Tiết", years: "1892 - 1981",image: "/phamphutiet_1.jpg", slug: "pham-phu-tiet-tong-doc-chien-si-cach-mang" },
  { name: "Phạm Phú Bằng", years: "1930 – 2024", image: "/phamphubang_1.jpeg", slug: "pham-phu-bang-dai-ta-nha-bao" },
  { name: "Phạm Phú Quốc", years: "1935 – 1965", image: "/phamphuquoc_1.jpg", slug: "pham-phu-quoc-phi-cong-huyen-thoai" },
];

/** Serialized version for server→client boundary (Date → string). */
type SerializedEvent = Omit<FamilyEvent, "nextOccurrence"> & {
  nextOccurrence: string;
};

interface LandingHighlightedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
}

interface LandingHeroProps {
  events: SerializedEvent[];
  highlightedPosts: LandingHighlightedPost[];
}

function formatPublishDate(value: string | null) {
  if (!value) return "Chưa rõ ngày đăng";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LandingHero({
  events,
  highlightedPosts,
}: LandingHeroProps) {
  return (
    <>
      {/* Hero Section */}
      <motion.section
        className="relative h-screen overflow-hidden border-b border-black/10"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <MuxPlayer
          playbackId={HERO_PLAYBACK_ID}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          metadata={{
            video_title: "Gia pha hero background",
            viewer_user_id: "public-landing",
          }}
          streamType="on-demand"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={muxBackgroundStyle}
        />

        <div className="absolute left-1/2 top-[calc(50%-136.5px)] z-10 w-full max-w-[984px] -translate-x-1/2 -translate-y-1/2 px-6">
          <motion.div className="mx-auto w-full text-center" variants={fadeIn}>
            <h1
              className={`${playfairVietnamese.className} mx-auto mt-5 max-w-[860px] text-[27px] leading-[1.25] text-[#212121] opacity-90 md:text-[34px] md:leading-[1.2] lg:text-[47px] lg:leading-[1.15]`}
            >
              Cây có gốc mới nở cành xanh ngọn <br/> Nước có nguồn mới bể rộng sông sâu.
            </h1>

            <p
              className={`${manrope.className} mx-auto mt-6 max-w-[510px] bg-linear-to-r from-[rgba(37,44,50,0.7)] to-[rgba(55,65,74,0.7)] bg-clip-text text-[18px] font-normal tracking-[-0.4px] text-transparent opacity-70 md:mt-8 md:text-[20px]`}
            >
              {"Gìn giữ cội nguồn, nối bước cha ông, phát huy giá trị di sản văn hóa dòng họ."}
            </p>
          </motion.div>
        </div>
      </motion.section>
      {/* Features Section */}
      <motion.section
        className="py-20 bg-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeIn}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="bg-rice-paper p-8 rounded-xl border-t-4 border-heritage-gold shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 bg-heritage-red/10 text-heritage-red rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-serif font-bold text-altar-wood mb-3">
                  {feature.title}
                </h3>
                <p className="text-altar-wood/60 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Ancestor Highlights */}
      <motion.section
        className="py-20 bg-rice-paper"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[1200px] mx-auto px-4">
          <motion.div
            className="flex items-center justify-between mb-12"
            variants={fadeIn}
          >
            <h2 className="text-3xl font-serif font-bold text-heritage-red border-b-2 border-heritage-gold pb-2">
              Tiền Nhân Nổi Bật
            </h2>
            <a
              className="text-heritage-red font-semibold flex items-center gap-1 hover:underline"
              href="#"
            >
              Xem tất cả{" "}
              <ArrowRight className="size-4" />
            </a>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {ancestors.map((ancestor, idx) => {
              const CardWrapper: ElementType = ancestor.slug ? Link : "div";
              const cardProps = ancestor.slug
                ? { href: `/blog/${ancestor.slug}` }
                : {};
              return (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                  className="group cursor-pointer"
                >
                  <CardWrapper
                    {...cardProps}
                    className="block bg-white p-4 rounded-lg shadow-sm border border-heritage-gold/10 hover:shadow-md transition-all h-full"
                  >
                    <div className="aspect-[3/4] rounded-md mb-4 bg-gradient-to-br from-heritage-red/5 to-heritage-gold/10 overflow-hidden relative flex items-center justify-center">
                      {ancestor.image ? (
                        <Image
                          src={ancestor.image}
                          alt={ancestor.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <UserRound className="size-16 text-heritage-red/20 group-hover:scale-110 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-heritage-red/5 group-hover:bg-transparent transition-colors" />
                    </div>
                    <h4 className="font-serif font-bold text-lg text-altar-wood">
                      {ancestor.name}
                    </h4>
                    <p className="text-altar-wood/50 text-sm">{ancestor.years}</p>
                    {ancestor.slug && (
                      <span className="text-heritage-red text-xs font-medium mt-1 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Đọc tiểu sử <ArrowRight className="size-3" />
                      </span>
                    )}
                  </CardWrapper>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Highlighted Blog Posts */}
      <motion.section
        className="py-20 bg-rice-paper"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[1200px] mx-auto px-4">
          <motion.div
            className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            variants={fadeIn}
          >
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-heritage-red border-b-2 border-heritage-gold pb-2">
              Bài Viết Nổi Bật
            </h2>
            <Link
              className="self-start text-heritage-red font-semibold flex items-center gap-1 hover:underline sm:self-auto"
              href="/blog"
            >
              Xem danh sách bài viết <ArrowRight className="size-4" />
            </Link>
          </motion.div>

          {highlightedPosts.length === 0 ? (
            <motion.div
              variants={fadeIn}
              className="rounded-2xl border border-heritage-gold/20 bg-white p-8 text-center"
            >
              <p className="text-altar-wood/60">
                Chưa có bài viết đã xuất bản.
              </p>
              <Link
                href="/blog"
                className="mt-4 inline-flex items-center gap-1 text-heritage-red font-semibold hover:underline"
              >
                Xem trang tin tức <ArrowRight className="size-4" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {highlightedPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  variants={fadeIn}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block h-full rounded-xl bg-white border border-heritage-gold/15 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-heritage-red/5 to-heritage-gold/10 overflow-hidden">
                      {post.coverImageUrl ? (
                        <Image
                          src={post.coverImageUrl}
                          alt={post.title}
                          fill
                          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays className="size-10 text-heritage-red/20" />
                        </div>
                      )}

                      {post.isFeatured && (
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide bg-heritage-red text-white">
                          Nổi bật
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex flex-col min-h-[180px]">
                      <p className="text-[11px] uppercase tracking-wider text-altar-wood/45 font-semibold">
                        {formatPublishDate(post.publishedAt)}
                      </p>
                      <h3 className="mt-2 font-serif font-bold text-lg leading-tight text-altar-wood line-clamp-2 break-words">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-altar-wood/60 line-clamp-3 break-words">
                        {post.excerpt || "Xem chi tiết bài viết để đọc đầy đủ nội dung."}
                      </p>
                      <span className="mt-auto pt-3 text-heritage-red text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Đọc bài viết <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* Timeline Section */}
      <motion.section
        className="py-20 bg-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-[800px] mx-auto px-4">
          <motion.h2
            className="text-3xl font-serif font-bold text-center text-altar-wood mb-16"
            variants={fadeIn}
          >
            Sự Kiện Sắp Tới
          </motion.h2>
          <div className="relative border-l-2 border-heritage-gold ml-4 md:ml-0">
            {events.length === 0 ? (
              <motion.div className="pl-10 py-8 text-center" variants={fadeIn}>
                <CalendarDays className="size-10 mx-auto mb-3 text-altar-wood/20" />
                <p className="text-altar-wood/50">Chưa có sự kiện nào sắp tới</p>
              </motion.div>
            ) : (
              events.map((event, idx) => (
                <motion.div
                  key={`${event.personId}-${event.type}-${idx}`}
                  className="mb-12 relative pl-10"
                  variants={fadeIn}
                >
                  <div
                    className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white ${event.type === "death_anniversary"
                      ? "bg-heritage-red"
                      : event.type === "custom_event"
                        ? "bg-heritage-gold"
                        : "bg-blue-400"
                      }`}
                  />
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                    <span className="text-heritage-red font-bold">
                      {event.eventDateLabel}
                    </span>
                    <span className="hidden md:block text-altar-wood/30">|</span>
                    <span className="text-altar-wood/50 italic">
                      {event.type === "death_anniversary"
                        ? "Ngày giỗ"
                        : event.type === "birthday"
                          ? "Sinh nhật"
                          : "Sự kiện"}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-altar-wood">
                    {event.personName}
                  </h4>
                  {(event.location || event.content) && (
                    <p className="text-altar-wood/60 mt-2">
                      {event.location || event.content}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.section>
    </>
  );
}

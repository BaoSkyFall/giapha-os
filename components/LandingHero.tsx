"use client";

import { FamilyEvent } from "@/utils/eventHelpers";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Search, TreePine, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  { name: "Phạm Phú Quốc", years: "1935 – 1965", image: "/phamphuquoc_1.jpg", slug: "pham-phu-quoc-phi-cong-huyen-thoai" },
  { name: "Phạm Phú Tiết", years: "", slug: "pham-phu-tiet-tong-doc-chien-si-cach-mang" },
  { name: "Phạm Phú Bằng", years: "1930 – 2024", image: "/phamphubang_1.jpeg", slug: "pham-phu-bang-dai-ta-nha-bao" },
];

/** Serialized version for server→client boundary (Date → string). */
type SerializedEvent = Omit<FamilyEvent, "nextOccurrence"> & {
  nextOccurrence: string;
};

// ---------------------------------------------------------------------------
// Hero image slider (auto-slide + drag, no arrows, no dots)
// ---------------------------------------------------------------------------

const SLIDES = [
  { src: "/hero-temple.jpg", alt: "Nhà thờ tộc truyền thống Việt Nam" },
  { src: "/hero-dinh.jpg",   alt: "Đình làng truyền thống" },
  { src: "/hero-lotus.jpg",  alt: "Ao sen làng quê Việt Nam" },
  { src: "/hero-altar.jpg",  alt: "Bàn thờ gia tiên" },
];

const SLIDE_DURATION = 4000; // ms between auto-advances
const DRAG_THRESHOLD = 50;   // px to trigger slide on drag

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: "easeOut" } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }),
};

function HeroSlider() {
  const [[index, dir], setSlide] = useState([0, 1]);

  const paginate = (newDir: number) => {
    setSlide(([prev]) => [(prev + newDir + SLIDES.length) % SLIDES.length, newDir]);
  };

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => paginate(1), SLIDE_DURATION);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <motion.div className="flex-1 relative w-full" variants={fadeIn}>
      {/* Gold corner accents */}
      <div className="absolute -top-3 -left-3 w-16 h-16 border-l-4 border-t-4 border-heritage-gold/60 rounded-tl-xl pointer-events-none z-20" />
      <div className="absolute -bottom-3 -right-3 w-16 h-16 border-r-4 border-b-4 border-heritage-gold/60 rounded-br-xl pointer-events-none z-20" />

      <div className="group relative rounded-2xl overflow-hidden shadow-2xl h-[380px] md:h-[460px] cursor-grab active:cursor-grabbing select-none">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -DRAG_THRESHOLD) paginate(1);
              else if (info.offset.x > DRAG_THRESHOLD) paginate(-1);
            }}
            className="absolute inset-0 w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SLIDES[index].src}
              alt={SLIDES[index].alt}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
          </motion.div>
        </AnimatePresence>

        {/* Prev arrow */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-white/60 text-heritage-red backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-heritage-red hover:text-white"
          aria-label="Previous image"
        >
          <ChevronLeft className="size-5" />
        </button>

        {/* Next arrow */}
        <button
          onClick={() => paginate(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-white/60 text-heritage-red backdrop-blur-sm shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-heritage-red hover:text-white"
          aria-label="Next image"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </motion.div>
  );
}



interface LandingHeroProps {
  events: SerializedEvent[];
}

export default function LandingHero({ events }: LandingHeroProps) {
  return (
    <>
      {/* Hero Section */}
      <motion.section
        className="relative py-16 md:py-24 bg-rice-paper border-b border-heritage-gold/20 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="max-w-[1200px] mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">

            {/* Left: Text */}
            <div className="flex-1 text-center md:text-left">
              <motion.p
                className="text-heritage-gold font-semibold uppercase tracking-widest text-sm mb-3"
                variants={fadeIn}
              >
                Gia Phả Điện Tử · Tộc Phạm Phú
              </motion.p>
              <motion.h2
                className="text-5xl md:text-6xl font-serif font-black text-heritage-red leading-tight mb-6"
                variants={fadeIn}
              >
                Lưu giữ lịch sử –<br />
                Kết nối hậu duệ
              </motion.h2>
              <motion.p
                className="text-lg text-altar-wood/70 max-w-xl mb-10 leading-relaxed font-light"
                variants={fadeIn}
              >
                Khám phá cội nguồn và kết nối các thế hệ trong dòng họ qua nền
                tảng gia phả trực tuyến hiện đại nhưng đậm chất truyền thống.
              </motion.p>
              <motion.div
                className="flex flex-wrap justify-center md:justify-start gap-4"
                variants={fadeIn}
              >
                <Link
                  href="/login"
                  className="bg-heritage-red text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-heritage-red-dark transition-all shadow-xl flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <TreePine className="size-5" />
                  Xem cây gia phả
                </Link>
                <button className="border-2 border-heritage-red text-heritage-red px-8 py-4 rounded-lg font-bold text-lg hover:bg-heritage-red hover:text-white transition-all hover:-translate-y-0.5">
                  Thêm thành viên
                </button>
              </motion.div>
              <motion.p
                className="mt-8 text-altar-wood/40 italic text-sm"
                variants={fadeIn}
              >
                "Cây có cội, nước có nguồn. Chim có tổ, người có tông."
              </motion.p>
            </div>

            {/* Right: Temple Image */}
            <HeroSlider />

          </div>
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
              const CardWrapper = ancestor.slug ? Link : "div";
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
                    {...(cardProps as any)}
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

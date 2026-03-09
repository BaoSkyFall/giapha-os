"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Download,
    Heart,
    ImagePlus,
    MapPin,
    Search,
    Share2,
    Upload,
    X,
} from "lucide-react";
import { useState } from "react";

const fadeIn: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const categories = ["Tất cả", "Gia đình", "Sự kiện", "Tài liệu", "Lịch sử"];

interface GalleryItem {
    id: number;
    title: string;
    meta: string;
    metaIcon: "calendar" | "location" | "history" | "heart" | "archive";
    category: string;
    gradient: string;
}

const galleryItems: GalleryItem[] = [
    {
        id: 1,
        title: "Họp mặt dòng họ Xuân 2025",
        meta: "10/02/2025 • Xuân Ất Tỵ",
        metaIcon: "calendar",
        category: "Sự kiện",
        gradient: "from-heritage-red/10 to-heritage-gold/10",
    },
    {
        id: 2,
        title: "Gia phả cổ 1895",
        meta: "Tư liệu quý • Bản gốc lưu trữ",
        metaIcon: "history",
        category: "Tài liệu",
        gradient: "from-altar-wood/10 to-heritage-gold/5",
    },
    {
        id: 3,
        title: "Lễ tế tổ rằm tháng Giêng",
        meta: "Nhà thờ tổ • Hội An",
        metaIcon: "location",
        category: "Sự kiện",
        gradient: "from-heritage-red/5 to-accent-pink/10",
    },
    {
        id: 4,
        title: "Mừng thọ Cụ Phạm Phú Tấn",
        meta: "Đại thọ 90 tuổi • 2024",
        metaIcon: "calendar",
        category: "Gia đình",
        gradient: "from-heritage-gold/10 to-jade-green/5",
    },
    {
        id: 5,
        title: "Đám cưới chi 2",
        meta: "Kỷ niệm vui • 05/11/2024",
        metaIcon: "heart",
        category: "Gia đình",
        gradient: "from-accent-pink/10 to-heritage-gold/10",
    },
    {
        id: 6,
        title: "Kho lưu trữ máy ảnh cổ",
        meta: "Bảo tàng gia tộc",
        metaIcon: "archive",
        category: "Lịch sử",
        gradient: "from-altar-wood/5 to-heritage-red/5",
    },
];

function MetaIcon({ type }: { type: GalleryItem["metaIcon"] }) {
    switch (type) {
        case "calendar":
            return <CalendarDays className="size-3" />;
        case "location":
            return <MapPin className="size-3" />;
        case "heart":
            return <Heart className="size-3" />;
        default:
            return <CalendarDays className="size-3" />;
    }
}

export default function GalleryPage() {
    const [activeCategory, setActiveCategory] = useState("Tất cả");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

    const filteredItems = galleryItems.filter((item) => {
        const matchesCategory =
            activeCategory === "Tất cả" || item.category === activeCategory;
        const matchesSearch = item.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen flex flex-col bg-rice-paper selection:bg-heritage-gold/30 selection:text-heritage-red relative overflow-hidden">
            <Header siteName={config.siteName} />

            <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-6 py-10">
                {/* Title & Hero */}
                <motion.div
                    className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                >
                    <motion.div className="max-w-2xl" variants={fadeIn}>
                        <h2 className="text-5xl md:text-6xl font-serif font-black text-altar-wood leading-tight relative pb-3">
                            Kho Ảnh Gia Đình
                            <span className="absolute bottom-0 left-0 w-20 h-[3px] bg-heritage-gold rounded-full" />
                        </h2>
                        <p className="mt-6 text-lg text-altar-wood/60 font-serif italic">
                            Lưu giữ những khoảnh khắc quý giá và tư liệu lịch sử qua nhiều
                            thế hệ của dòng họ Phạm Phú.
                        </p>
                    </motion.div>
                    <motion.button
                        variants={fadeIn}
                        className="flex items-center gap-2 bg-heritage-red text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-heritage-red/30 hover:scale-105 transition-transform shrink-0"
                    >
                        <Upload className="size-5" />
                        Tải ảnh lên
                    </motion.button>
                </motion.div>

                {/* Upload Drop Zone */}
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="bg-white/50 border-2 border-dashed border-heritage-red/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/80 hover:border-heritage-red/40 transition-all group">
                        <div className="size-16 rounded-full bg-heritage-red/5 flex items-center justify-center text-heritage-red mb-4 group-hover:scale-110 transition-transform">
                            <ImagePlus className="size-8" />
                        </div>
                        <h3 className="font-bold text-lg text-altar-wood">
                            Kéo và thả tệp tin vào đây
                        </h3>
                        <p className="text-altar-wood/50 text-sm mt-1">
                            Hỗ trợ JPG, PNG, MP4. Dung lượng tối đa 50MB.
                        </p>
                    </div>
                </motion.div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2 rounded-full font-semibold text-sm transition-all ${activeCategory === cat
                                        ? "bg-heritage-red text-white shadow-md"
                                        : "bg-white text-altar-wood/70 hover:bg-heritage-red/5 border border-heritage-gold/20"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-altar-wood/30" />
                        <input
                            className="w-full pl-12 pr-4 py-3 rounded-full border border-heritage-gold/20 bg-white focus:ring-heritage-gold focus:border-heritage-gold text-altar-wood placeholder-altar-wood/30 outline-none transition-all"
                            placeholder="Tìm kiếm kỷ niệm..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Gallery Grid */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    key={activeCategory}
                >
                    {filteredItems.map((item) => (
                        <motion.div
                            key={item.id}
                            variants={fadeIn}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            className="bg-white p-3 shadow-sm border border-heritage-gold/20 cursor-pointer group"
                            onClick={() => setSelectedItem(item)}
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-rice-paper mb-3">
                                <div
                                    className={`w-full h-full bg-gradient-to-br ${item.gradient} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}
                                >
                                    <ImagePlus className="size-12 text-altar-wood/10" />
                                </div>
                            </div>
                            <div className="flex justify-between items-start px-1 pb-1">
                                <div>
                                    <h4 className="font-serif font-bold text-altar-wood text-[15px] group-hover:text-heritage-red transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-altar-wood/50 mt-1 flex items-center gap-1">
                                        <MetaIcon type={item.metaIcon} />
                                        {item.meta}
                                    </p>
                                </div>
                                <Heart className="size-5 text-heritage-red/20 group-hover:text-heritage-red transition-colors shrink-0 mt-0.5" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-altar-wood/40">
                        <Search className="size-12 mb-4" />
                        <p className="text-lg font-medium">Không tìm thấy hình ảnh</p>
                        <p className="text-sm">
                            Thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.
                        </p>
                    </div>
                )}

                {/* Load More */}
                {filteredItems.length > 0 && (
                    <div className="flex justify-center mt-16">
                        <button className="px-10 py-3 rounded-full border-2 border-heritage-red text-heritage-red font-bold hover:bg-heritage-red hover:text-white transition-all hover:-translate-y-0.5">
                            Xem thêm hình ảnh
                        </button>
                    </div>
                )}
            </main>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 lg:p-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedItem(null)}
                    >
                        <button
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
                            onClick={() => setSelectedItem(null)}
                        >
                            <X className="size-8" />
                        </button>

                        <div
                            className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Image area */}
                            <div className="lg:col-span-2 relative group">
                                <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-altar-wood/20 to-heritage-gold/10 flex items-center justify-center shadow-2xl">
                                    <ImagePlus className="size-24 text-white/20" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                        <ChevronLeft className="size-6" />
                                    </button>
                                    <button className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                        <ChevronRight className="size-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Detail panel */}
                            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl text-white">
                                <h3 className="font-serif text-2xl font-bold mb-2">
                                    {selectedItem.title}
                                </h3>
                                <p className="text-white/60 text-sm mb-6">
                                    {selectedItem.meta}
                                </p>

                                <div className="mb-8">
                                    <h4 className="text-heritage-gold text-xs uppercase tracking-widest font-bold mb-4">
                                        Mô tả chi tiết
                                    </h4>
                                    <p className="text-white/80 leading-relaxed font-serif italic">
                                        &ldquo;Khoảnh khắc quý giá trong hành trình gìn giữ cội
                                        nguồn và kết nối các thế hệ dòng họ Phạm Phú.&rdquo;
                                    </p>
                                </div>

                                <div className="mb-8">
                                    <h4 className="text-heritage-gold text-xs uppercase tracking-widest font-bold mb-4">
                                        Danh mục
                                    </h4>
                                    <span className="inline-flex items-center gap-1.5 bg-white/5 rounded-full px-4 py-1.5 border border-white/10 text-sm">
                                        {selectedItem.category}
                                    </span>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-white/10">
                                    <button className="flex-1 flex items-center justify-center gap-2 bg-heritage-red py-3 rounded-full font-bold hover:bg-heritage-red-dark transition-colors">
                                        <Download className="size-4" /> Tải về
                                    </button>
                                    <button className="size-12 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                                        <Share2 className="size-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}

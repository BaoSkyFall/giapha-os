"use client";

import { useUser } from "@/components/UserProvider";
import {
    BarChart3,
    Database,
    FileText,
    Import,
    Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
    key: string;
    href: string;
    label: string;
    icon: React.ReactNode;
}

const adminItems: NavItem[] = [
    {
        key: "blog",
        href: "/dashboard/blog",
        label: "Bài viết",
        icon: <FileText className="size-5" />,
    },
    {
        key: "users",
        href: "/dashboard/users",
        label: "Quản lý người dùng",
        icon: <Settings className="size-5" />,
    },
    {
        key: "stats",
        href: "/dashboard/stats",
        label: "Thống kê dữ liệu",
        icon: <BarChart3 className="size-5" />,
    },
    {
        key: "data-import",
        href: "/dashboard/data",
        label: "Nhập dữ liệu",
        icon: <Import className="size-5" />,
    },
    {
        key: "data-center",
        href: "/dashboard/data",
        label: "Trung tâm dữ liệu",
        icon: <Database className="size-5" />,
    },
];

export default function DashboardSidebar() {
    const { isAdmin } = useUser();
    const pathname = usePathname();

    if (!isAdmin) return null;

    const isActive = (href: string) => pathname.startsWith(href);

    return (
        <aside className="hidden md:flex w-60 bg-heritage-red flex-col shrink-0">
            <div className="flex-1 py-4">
                <div className="px-3 mb-2">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-3">
                        Quản trị
                    </p>
                </div>
                <nav className="space-y-0.5">
                    {adminItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={`flex items-center gap-3 px-6 py-3 transition-all text-sm font-medium ${active
                                    ? "text-white border-l-4 border-heritage-gold bg-white/10"
                                    : "text-white/70 hover:bg-white/10 hover:text-white border-l-4 border-transparent"
                                    }`}
                            >
                                <span className={active ? "text-heritage-gold" : ""}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 bg-black/10">
                <div className="rounded-lg bg-white/10 p-3 text-center">
                    <p className="text-[10px] text-white/60 italic leading-relaxed">
                        &ldquo;Cây có cội mới nảy cành xanh lá, nước có nguồn mới bể rộng
                        sông sâu.&rdquo;
                    </p>
                </div>
            </div>
        </aside>
    );
}

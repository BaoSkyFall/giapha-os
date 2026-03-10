"use client";

import { useAuth } from "@/components/AuthProvider";
import HeaderMenu from "@/components/HeaderMenu";
import { UserProvider } from "@/components/UserProvider";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavLink {
    label: string;
    href: string;
    authOnly?: boolean;
}

const navLinks: NavLink[] = [
    { label: "Trang chủ", href: "/" },
    { label: "Giới thiệu", href: "/about" },
    { label: "Gia phả", href: "/dashboard/members" },
    { label: "Tin tức", href: "/blog" },
    { label: "Thư viện", href: "/gallery" },
    { label: "Sự kiện", href: "/dashboard/events", authOnly: true },
    { label: "Tra cứu", href: "/dashboard/kinship", authOnly: true },
    // { label: "Dòng dõi", href: "/dashboard/lineage", authOnly: true },
];

interface HeaderProps {
    readonly siteName?: string;
}

export default function Header({ siteName = "Tộc Phạm Phú" }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, profile } = useAuth();
    const pathname = usePathname();

    const isLoggedIn = !!user;

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    const visibleLinks = navLinks.filter(
        (link) => !link.authOnly || isLoggedIn
    );

    return (
        <header className="sticky top-0 z-50 w-full bg-heritage-red shadow-lg">
            <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/icon.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="object-contain rounded-md"
                    />
                    <span className="text-white text-2xl font-serif font-bold tracking-tight">
                        {siteName}
                    </span>
                </Link>
                <nav className="hidden lg:flex items-center gap-6">
                    {visibleLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`text-sm font-medium transition-colors ${isActive(link.href)
                                ? "text-heritage-gold"
                                : "text-white/90 hover:text-heritage-gold"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <UserProvider user={user} profile={profile}>
                            <HeaderMenu />
                        </UserProvider>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex bg-heritage-gold text-heritage-red hover:bg-heritage-gold-light px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md"
                        >
                            Khám phá cây gia phả
                        </Link>
                    )}
                    <button
                        className="lg:hidden text-white p-1"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="size-6" />
                        ) : (
                            <Menu className="size-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden bg-heritage-red/95 border-t border-white/10 backdrop-blur-sm">
                    <nav className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col gap-1">
                        {visibleLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                                    ? "bg-white/10 text-heritage-gold"
                                    : "text-white/90 hover:bg-white/5 hover:text-heritage-gold"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {!isLoggedIn && (
                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="sm:hidden mt-2 bg-heritage-gold text-heritage-red hover:bg-heritage-gold-light px-4 py-2.5 rounded-lg font-bold text-sm text-center transition-all"
                            >
                                Khám phá cây gia phả
                            </Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}

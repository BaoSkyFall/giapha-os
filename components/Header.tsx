"use client";

import { Menu, TreePine } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const navLinks = ["Gia phả", "Lịch sử", "Thành viên", "Sự kiện", "Tra cứu"];

interface HeaderProps {
    readonly siteName: string;
}

export default function Header({ siteName }: HeaderProps) {
    return (
        <header className="sticky top-0 z-50 w-full bg-heritage-red shadow-lg">
            <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image
                        src="/icon.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="object-contain rounded-md"
                    />
                    <h1 className="text-white text-2xl font-serif font-bold tracking-tight">
                        {siteName}
                    </h1>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link}
                            href="#"
                            className="text-white/90 hover:text-heritage-gold text-sm font-medium transition-colors"
                        >
                            {link}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden sm:inline-flex bg-heritage-gold text-heritage-red hover:bg-heritage-gold-light px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-md"
                    >
                        Khám phá cây gia phả
                    </Link>
                    <button className="md:hidden text-white p-1">
                        <Menu className="size-6" />
                    </button>
                </div>
            </div>
        </header>
    );
}

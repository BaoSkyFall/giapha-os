"use client";

import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Giới thiệu", href: "/about" },
  { label: "Gia phả", href: "/dashboard/members" },
  { label: "Tin tức", href: "/blog" },
  { label: "Thư viện", href: "/gallery" },
  { label: "Sự kiện", href: "/dashboard/events" },
  { label: "Tra cứu", href: "/dashboard/kinship" },
  // { label: "Dòng dõi", href: "/dashboard/lineage" },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full bg-heritage-red shadow-lg">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain rounded-md"
          />
          <span className="text-white text-2xl font-serif font-bold tracking-tight">
            {config.siteName}
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
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
          <HeaderMenu />
          <button
            className="lg:hidden text-white p-1"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-heritage-red/95 border-t border-white/10 backdrop-blur-sm">
          <nav className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                  ? "bg-white/10 text-heritage-gold"
                  : "text-white/90 hover:bg-white/5 hover:text-heritage-gold"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

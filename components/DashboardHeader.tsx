"use client";

import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import { Menu, X, TreePine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/dashboard/members", label: "Gia phả", exact: false },
  { href: "/dashboard/events", label: "Sự kiện", exact: false },
  { href: "/dashboard/kinship", label: "Tra cứu", exact: false },
  { href: "/dashboard/lineage", label: "Dòng dõi", exact: false },
];

export default function DashboardHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 w-full bg-heritage-red shadow-lg">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TreePine className="size-7 text-heritage-gold" />
          <Link href="/dashboard">
            <h1 className="text-white text-2xl font-serif font-bold tracking-tight">
              {config.siteName}
            </h1>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${active
                  ? "text-heritage-gold"
                  : "text-white/90 hover:text-heritage-gold"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <HeaderMenu />
          <button
            className="md:hidden text-white p-1"
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
        <nav className="md:hidden border-t border-white/10 bg-heritage-red">
          <div className="max-w-[1200px] mx-auto px-4 py-2 flex flex-col">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`py-3 px-2 text-sm font-medium border-b border-white/5 last:border-0 transition-colors ${active
                    ? "text-heritage-gold"
                    : "text-white/80 hover:text-heritage-gold"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MessageSquare,
  Cloud,
  HardDrive,
  Trash2,
  Users,
  GitFork,
  Calendar,
  BookOpen,
  X,
} from "lucide-react";

export type SessionSource = "local" | "supabase";

export interface SessionMeta {
  id: string;
  title: string;
  updatedAt: string;
  source: SessionSource;
}

interface SidebarProps {
  sessions: SessionMeta[];
  activeSessionId?: string;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onNewSession: () => void;
  onSelectSession: (session: SessionMeta) => void;
  onDeleteSession: (session: SessionMeta, e: React.MouseEvent) => void;
}

const EXPLORE_LINKS = [
  { href: "/dashboard/members", label: "Thành viên", icon: Users },
  { href: "/dashboard/tree", label: "Cây gia phả", icon: GitFork },
  { href: "/events", label: "Sự kiện", icon: Calendar },
  { href: "/blog", label: "Tư liệu", icon: BookOpen },
];

export default function Sidebar({
  sessions,
  activeSessionId,
  isDesktopOpen,
  isMobileOpen,
  onCloseMobile,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-[#292725] border-r border-[#E8E2D8]">
      {/* Top action: Tra cứu mới */}
      <div className="p-3.5 border-b border-[#E8E2D8] flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewSession();
            onCloseMobile();
          }}
          className="flex-1 flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl bg-[#A91E22] hover:bg-[#8C171B] text-white text-sm font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tra cứu mới</span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-[#5C5750] hover:bg-[#F3EFE6] transition-colors"
          aria-label="Đóng thanh bên"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search history */}
      <div className="px-3.5 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A8378] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm lịch sử tra cứu..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#FAF8F3] border border-[#E8E2D8] text-sm text-[#292725] placeholder:text-[#8A8378] focus:outline-none focus:border-[#A91E22] transition-colors"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-1">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A8378]">
          Lịch sử tra cứu
        </p>

        {filteredSessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[#8A8378]">
            <MessageSquare className="w-5 h-5 mx-auto mb-1.5 text-[#D6CEC0]" />
            {searchQuery.trim()
              ? "Không tìm thấy phiên phù hợp"
              : "Chưa có phiên tra cứu nào"}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session);
                  onCloseMobile();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSession(session);
                    onCloseMobile();
                  }
                }}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#FDF2F2] text-[#A91E22] font-semibold border border-[#A91E22]/20"
                    : "text-[#5C5750] hover:bg-[#F3EFE6] hover:text-[#292725]"
                }`}
              >
                {session.source === "supabase" ? (
                  <Cloud className="w-3.5 h-3.5 shrink-0 text-[#8A8378]" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 shrink-0 text-[#8A8378]" />
                )}
                <span className="text-xs truncate flex-1">{session.title}</span>
                <button
                  type="button"
                  onClick={(e) => onDeleteSession(session, e)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-[#8A8378] hover:text-[#A91E22] hover:bg-[#FFFFFF] transition-all shrink-0"
                  aria-label="Xóa phiên"
                  title="Xóa phiên"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Explore section */}
      <div className="p-3 border-t border-[#E8E2D8] bg-[#FAF8F3] shrink-0 space-y-1">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A8378]">
          Khám phá
        </p>
        <nav className="grid grid-cols-2 gap-1.5">
          {EXPLORE_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#5C5750] bg-[#FFFFFF] border border-[#E8E2D8] hover:border-[#A91E22] hover:text-[#A91E22] transition-colors"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {isDesktopOpen && (
        <aside className="hidden lg:flex w-[272px] shrink-0 h-full">
          <div className="w-full h-full">{sidebarContent}</div>
        </aside>
      )}

      {/* Mobile slide-over drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#292725]/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full bg-[#FFFFFF] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

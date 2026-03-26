"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Sticky AI Chat Widget — visible on every page for all users (including anonymous).
 * Shows a floating Heritage Crimson button (bottom-right) that expands into a
 * welcome bubble with a CTA to open the full AI Advisor chat.
 */
export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const pathname = usePathname();

  // Auto-open the bubble after 3s on first visit (once per browser session)
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("ai-widget-shown");
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      setHasAutoOpened(true);
      sessionStorage.setItem("ai-widget-shown", "1");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Suppress unused-var warning — hasAutoOpened is intentionally tracked for future use
  void hasAutoOpened;

  // Don't render on the AI Advisor page itself
  if (pathname.startsWith("/ai-advisor")) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Speech bubble (expanded state) ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-72 bg-white rounded-2xl shadow-2xl border border-[#E8B931]/20 relative overflow-visible"
            style={{ boxShadow: "0 8px 40px rgba(179,29,29,0.13), 0 2px 8px rgba(0,0,0,0.06)" }}
          >
            {/* Gold ribbon at top */}
            <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-[#E8B931] via-[#B31D1D] to-[#E8B931]" />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {/* AI avatar */}
                  <div className="w-9 h-9 rounded-full bg-[#B31D1D] flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white text-xs font-bold tracking-wide" style={{ fontFamily: "Inter, sans-serif" }}>AI</span>
                  </div>
                  <div>
                    <p
                      className="text-[#B31D1D] font-bold text-sm leading-tight flex items-center gap-1.5"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Trợ lý AI Tộc Phạm Phú
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-[#E8B931]/20 text-[#9a6800] border border-[#E8B931]/40 px-1.5 py-0.5 rounded-full leading-none">
                        Beta
                      </span>
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-600 text-[10px] font-medium">Đang hoạt động</span>
                    </div>
                  </div>
                </div>
                {/* Close button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 -mt-0.5"
                  aria-label="Đóng"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Message */}
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Xin chào! Bạn có thể hỏi tôi bất kỳ câu hỏi nào về dòng họ Phạm Phú
              </p>

              {/* CTA */}
              <Link
                href="/ai-advisor"
                className="flex items-center justify-center gap-2 w-full bg-[#B31D1D] hover:bg-[#9a1818] text-white text-sm font-semibold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                Khám Phá
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Triangle caret pointing down-right to the button */}
            <div
              className="absolute -bottom-[10px] right-5 w-5 h-[10px] overflow-hidden"
              aria-hidden="true"
            >
              <div className="w-4 h-4 bg-white border-b border-r border-[#E8B931]/20 rotate-45 translate-y-[-50%] translate-x-[10%] shadow-sm" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating trigger button (always visible) ── */}
      <div className="relative group">
        {/* Tooltip */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0, y: 4 }}
              whileHover={{ opacity: 1, y: 0 }}
              className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-white text-[#B31D1D] text-xs font-semibold rounded-full shadow-md border border-[#E8B931]/20 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Hỏi AI về gia phả
            </motion.div>
          )}
        </AnimatePresence>

        {/* Green active dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white z-10 animate-pulse" />

        {/* Main circle button */}
        <motion.button
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Mở Trợ lý AI Tộc Phạm Phú"
          className="w-14 h-14 rounded-full bg-[#B31D1D] text-white flex items-center justify-center shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B931]"
          style={{ boxShadow: "0 4px 20px rgba(179,29,29,0.45), 0 1px 4px rgba(0,0,0,0.1)" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.svg
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                width="22" height="22" viewBox="0 0 22 22" fill="none"
              >
                <path d="M2 2l18 18M20 2L2 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </motion.svg>
            ) : (
              <motion.span
                key="icon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="material-symbols-outlined text-[26px] select-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Info, KeyRound, Network, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./LogoutButton";
import { useUser } from "./UserProvider";

type HeaderMenuProps = {
  displayName?: string | null;
};

const resolveDisplayName = (
  explicitDisplayName: string | null | undefined,
  profileDisplayName: string | null | undefined,
  metadataDisplayName: unknown,
) => {
  if (explicitDisplayName && explicitDisplayName.trim()) {
    return explicitDisplayName.trim();
  }

  if (profileDisplayName && profileDisplayName.trim()) {
    return profileDisplayName.trim();
  }

  if (typeof metadataDisplayName === "string" && metadataDisplayName.trim()) {
    return metadataDisplayName.trim();
  }

  return "Người dùng";
};

const resolveAvatarLabel = (displayName: string) => {
  const normalized = displayName.trim();
  if (!normalized) return "U";

  const parts = normalized.split(/\s+/);
  const lastWord = parts[parts.length - 1] || normalized;
  const firstCharacter = lastWord.charAt(0);

  return (firstCharacter || normalized.charAt(0) || "U").toUpperCase();
};

export default function HeaderMenu({ displayName }: HeaderMenuProps) {
  const { user, profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const resolvedDisplayName = resolveDisplayName(
    displayName,
    profile?.full_name,
    user?.user_metadata?.full_name,
  );
  const avatarLabel = resolveAvatarLabel(resolvedDisplayName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex sm:min-w-[220px] items-center gap-2 rounded-full border border-transparent py-1.5 pl-2 pr-4 transition-all duration-200 hover:border-stone-200 hover:bg-stone-100 justify-end"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-amber-200 to-amber-100 font-bold text-amber-800 shadow-sm ring-1 ring-amber-300/50">
          {avatarLabel || <UserCircle className="size-5" />}
        </div>
        <span className="hidden flex-1 text-sm font-medium text-white group-hover:text-stone-700 sm:block">
          {resolvedDisplayName}
        </span>
        <ChevronDown
          className={`size-4 text-white transition-all duration-300 group-hover:text-stone-700 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-stone-200/60 bg-white py-2 shadow-xl"
          >
            <div className="border-b border-stone-100 bg-stone-50/50 px-4 py-3">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                Tài khoản
              </p>
              <p className="text-sm font-medium text-stone-900 break-words">
                {resolvedDisplayName}
              </p>
            </div>

            <div className="py-1">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700"
              >
                <Network className="size-4" />
                Bảng điều khiển
              </Link>

              <Link
                href="/dashboard/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                <KeyRound className="size-4" />
                Đổi mật khẩu
              </Link>

              <Link
                href="/about"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
              >
                <Info className="size-4" />
                Giới thiệu
              </Link>

              <LogoutButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

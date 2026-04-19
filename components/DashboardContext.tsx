"use client";

import { Person } from "@/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { ViewMode } from "./ViewToggle";

export interface MemberMutation {
  kind: "upsert";
  source: "modal-edit" | "modal-create";
  person: Person;
  at: number;
}

interface DashboardState {
  memberModalId: string | null;
  setMemberModalId: (id: string | null) => void;
  showCreateMember: boolean;
  setShowCreateMember: (show: boolean) => void;
  showAvatar: boolean;
  setShowAvatar: (show: boolean) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  isViewLoading: boolean;
  rootId: string | null;
  setRootId: (id: string | null) => void;
  memberMutation: MemberMutation | null;
  publishMemberMutation: (mutation: Omit<MemberMutation, "at">) => void;
}

export const DashboardContext = createContext<DashboardState | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const ROOT_STORAGE_KEY = "dashboard_members_root_id";
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [memberModalId, setMemberModalId] = useState<string | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [view, setViewState] = useState<ViewMode>("list");
  const [isViewLoading, startViewTransition] = useTransition();
  const [rootId, setRootIdState] = useState<string | null>(null);
  const [memberMutation, setMemberMutation] = useState<MemberMutation | null>(null);

  useEffect(() => {
    const avatarParam = searchParams.get("avatar");
    setShowAvatar(avatarParam !== "hide");

    const viewParam = searchParams.get("view") as ViewMode;
    if (viewParam) setViewState(viewParam);

    const rootIdParam = searchParams.get("rootId");
    if (rootIdParam) {
      setRootIdState(rootIdParam);
    } else if (typeof window !== "undefined") {
      const persistedRootId = window.localStorage.getItem(ROOT_STORAGE_KEY);
      if (persistedRootId) {
        setRootIdState(persistedRootId);
      }
    }

    // We intentionally ignore memberModalId in the Next.js router loop
    // to avoid Next.js triggering re-renders on push.
    // If the URL has it on first load, we grab it from window.location instead
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const modalId = sp.get("memberModalId");
      if (modalId && !memberModalId) {
        setMemberModalId(modalId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to URL silently
  const updateModalId = (id: string | null) => {
    setMemberModalId(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("memberModalId", id);
      } else {
        newUrl.searchParams.delete("memberModalId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const updateAvatar = (show: boolean) => {
    setShowAvatar(show);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (!show) {
        newUrl.searchParams.set("avatar", "hide");
      } else {
        newUrl.searchParams.delete("avatar");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setView = (v: ViewMode) => {
    setViewState(v);

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    if ((v === "tree" || v === "mindmap") && rootId) {
      params.set("rootId", rootId);
    } else {
      params.delete("rootId");
    }

    const query = params.toString();
    startViewTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  const setRootId = (id: string | null) => {
    setRootIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        window.localStorage.setItem(ROOT_STORAGE_KEY, id);
      } else {
        window.localStorage.removeItem(ROOT_STORAGE_KEY);
      }

      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("rootId", id);
      } else {
        newUrl.searchParams.delete("rootId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const publishMemberMutation = (mutation: Omit<MemberMutation, "at">) => {
    setMemberMutation({
      ...mutation,
      at: Date.now(),
    });
  };

  return (
    <DashboardContext.Provider
      value={{
        memberModalId,
        setMemberModalId: updateModalId,
        showCreateMember,
        setShowCreateMember,
        showAvatar,
        setShowAvatar: updateAvatar,
        view,
        setView,
        isViewLoading,
        rootId,
        setRootId,
        memberMutation,
        publishMemberMutation,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  // Return a safe no-op fallback when used outside DashboardProvider
  // (e.g., on the /dashboard/members/[id] standalone page)
  if (context === undefined) {
    return {
      memberModalId: null,
      setMemberModalId: () => {},
      showCreateMember: false,
      setShowCreateMember: () => {},
      showAvatar: true,
      setShowAvatar: () => {},
      view: "list",
      setView: () => {},
      isViewLoading: false,
      rootId: null,
      setRootId: () => {},
      memberMutation: null,
      publishMemberMutation: () => {},
    };
  }
  return context;
}

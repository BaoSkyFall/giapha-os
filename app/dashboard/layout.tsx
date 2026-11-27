import config from "@/app/config";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar from "@/components/DashboardSidebar";
import LogoutButton from "@/components/LogoutButton";
import { UserProvider } from "@/components/UserProvider";
import { getProfile, getUser } from "@/utils/supabase/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLocalOfflineDev =
    process.env.NODE_ENV === "development" &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const user = await getUser();

  if (!user && !isLocalOfflineDev) {
    redirect("/login");
  }

  const profile = user ? await getProfile(user.id) : null;
  const effectiveProfile =
    profile ??
    (isLocalOfflineDev
      ? {
          id: "local-dev-viewer",
          role: "member" as const,
          is_active: true,
          full_name: "Local Dev Viewer",
        }
      : null);
  const shouldShowSidebar = effectiveProfile?.role === "admin";

  if (!effectiveProfile?.is_active) {
    return (
      <div className="min-h-screen bg-rice-paper text-altar-wood flex flex-col font-sans">
        <header className="sticky top-0 z-30 h-16 bg-heritage-red text-white px-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">
                {config.siteName}
              </h1>
            </Link>
          </div>
          <div className="w-32">
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full text-center bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-heritage-gold/10">
            <div className="w-16 h-16 bg-heritage-gold/10 text-heritage-red rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="size-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-altar-wood mb-2">
              Tài khoản chờ duyệt
            </h2>
            <p className="text-altar-wood/70">
              Tài khoản của bạn đã được đăng ký thành công. Tuy nhiên, hệ thống
              yêu cầu Quản trị viên kích hoạt tài khoản của bạn trước khi bạn có
              thể xem các thông tin gia đình.
            </p>
            <p className="text-altar-wood/50 text-sm mt-4 italic">
              Vui lòng liên hệ lại với người quản trị dòng họ để được cấp quyền
              sớm nhất.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <UserProvider
      user={
        user ?? {
          id: "local-dev-viewer",
          email: "local@tocphamphu.local",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "",
        }
      }
      profile={effectiveProfile as never}
    >
      <div className="h-screen flex flex-col overflow-hidden bg-rice-paper text-altar-wood font-sans">
        <DashboardHeader />
        <div className="flex flex-1 overflow-hidden">
          {shouldShowSidebar ? <DashboardSidebar /> : null}
          <main className="flex-1 flex flex-col overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  );
}

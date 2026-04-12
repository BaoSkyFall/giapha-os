"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";
import { KeyRound, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Không thể tải thông tin tài khoản.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Không thể kiểm tra quyền quản trị.");
        return;
      }

      if (profile.role !== "admin") {
        await supabase.auth.signOut();
        setError(
          "Tài khoản này không có quyền quản trị. Vui lòng đăng nhập bằng OTP số điện thoại.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-rice-paper selection:bg-heritage-gold/30 selection:text-heritage-red">
      <Header siteName={config.siteName} />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
          <div className="relative bg-gradient-to-br from-heritage-red via-heritage-red-dark to-heritage-red p-8 pb-6">
            <div className="absolute top-0 right-0 left-0 h-1 bg-heritage-gold" />
            <div className="relative z-10 flex items-center gap-3">
              <ShieldAlert className="size-6 text-heritage-gold" />
              <h3 className="text-lg font-bold tracking-wide text-heritage-gold uppercase">
                Đăng nhập quản trị
              </h3>
            </div>
          </div>

          <div className="border border-heritage-gold/10 bg-white p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 ml-1 block text-[13px] font-semibold text-heritage-red"
                >
                  Email quản trị
                </label>
                <div className="group relative flex items-center">
                  <Mail className="absolute left-3.5 size-5 text-altar-wood/30 transition-colors group-focus-within:text-heritage-red" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-lg border border-heritage-gold/20 bg-rice-paper/50 py-3.5 pr-4 pl-11 text-altar-wood placeholder-altar-wood/30 shadow-sm transition-all duration-200 outline-none focus:border-heritage-gold focus:bg-white focus:ring-heritage-gold"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 ml-1 block text-[13px] font-semibold text-heritage-red"
                >
                  Mật khẩu
                </label>
                <div className="group relative flex items-center">
                  <KeyRound className="absolute left-3.5 size-5 text-altar-wood/30 transition-colors group-focus-within:text-heritage-red" />
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-heritage-gold/20 bg-rice-paper/50 py-3.5 pr-4 pl-11 text-altar-wood placeholder-altar-wood/30 shadow-sm transition-all duration-200 outline-none focus:border-heritage-gold focus:bg-white focus:ring-heritage-gold"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-heritage-red/10 bg-heritage-red/5 p-3 text-center text-[13px] font-medium text-heritage-red">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập quản trị"}
              </button>
            </form>

            <div className="relative my-6 flex items-center py-2 opacity-60">
              <div className="grow border-t border-heritage-gold/30" />
              <span className="mx-4 shrink-0 text-[11px] font-bold tracking-wider text-altar-wood/40 uppercase">
                Thành viên
              </span>
              <div className="grow border-t border-heritage-gold/30" />
            </div>

            <Link
              href="/login"
              className="block w-full rounded-lg border border-heritage-gold/20 bg-white py-3.5 text-center text-sm font-semibold text-heritage-red shadow-sm transition-all duration-200 hover:bg-rice-paper hover:text-heritage-red-dark"
            >
              Quay lại đăng nhập OTP
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

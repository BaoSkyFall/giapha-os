"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  KeyRound,
  Mail,
  Shield,
  ShieldCheck,
  TreePine,
  UserPlus,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === config.demoDomain) {
        setIsDemo(true);
        setEmail("giaphaos@homielab.com");
        setPassword("giaphaos");
      }
    }
  }, []);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLogin, setIsLogin] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        if (password !== confirmPassword) {
          setError("Mật khẩu xác nhận không khớp.");
          setLoading(false);
          return;
        }

        // 1. Try to sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          // Check if error is related to missing database schema/tables
          if (
            error.message.includes("relation") &&
            error.message.includes("does not exist")
          ) {
            router.push("/setup");
            return;
          }

          setError(error.message);
        } else if (data.user?.identities && data.user.identities.length === 0) {
          setError(
            "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
          );
        } else {
          if (data.session) {
            router.push("/dashboard");
            router.refresh();
          } else {
            // Attempt to sign in immediately (catches auto-confirmed first admin)
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email,
                password,
              });

            if (!signInError && signInData.session) {
              router.push("/dashboard");
              router.refresh();
            } else {
              setSuccessMessage(
                "Đăng ký thành công! Vui lòng chờ admin kích hoạt tài khoản để xem nội dung.",
              );
              setIsLogin(true); // Switch back to login view
              setConfirmPassword(""); // clear confirm password
              setPassword(""); // clear password
            }
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-rice-paper select-none selection:bg-heritage-gold/30 selection:text-heritage-red relative overflow-hidden">
      <Header siteName={config.siteName} />

      {/* Hero heading */}
      <div className="text-center pt-12 pb-6 relative z-10">
        <h2 className="text-4xl md:text-5xl font-serif font-black text-heritage-red leading-tight">
          Kết Nối Cội Nguồn
        </h2>
        <p className="mt-3 text-altar-wood/60 italic text-lg">
          &ldquo;Cây có cội, nước có nguồn. Chim có tổ, người có tông.&rdquo;
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-16 relative z-10 w-full">
        <motion.div
          className="max-w-md w-full rounded-2xl shadow-xl overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Card gradient header */}
          <div className="bg-gradient-to-br from-heritage-red via-heritage-red-dark to-heritage-red p-8 pb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-heritage-gold/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-heritage-gold" />

            <div className="relative z-10 flex items-center gap-3 mb-2">
              <Shield className="size-6 text-heritage-gold" />
              <h3 className="text-heritage-gold font-bold text-lg tracking-wide uppercase">
                {isLogin ? "Đăng nhập / Đăng ký" : "Tạo tài khoản"}
              </h3>
            </div>
          </div>

          {/* Card body */}
          <div className="bg-white p-8 border border-heritage-gold/10">
            {isDemo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 bg-heritage-gold/10 border border-heritage-gold/30 rounded-lg"
              >
                <p className="text-[13px] font-semibold text-heritage-red">
                  Website Demo. Dữ liệu đều không có thật.
                </p>
              </motion.div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="relative">
                  <label
                    htmlFor="email-address"
                    className="block text-[13px] font-semibold text-heritage-red mb-1.5 ml-1"
                  >
                    Email
                  </label>
                  <div className="relative flex items-center group">
                    <Mail className="absolute left-3.5 size-5 text-altar-wood/30 group-focus-within:text-heritage-red transition-colors" />
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="bg-rice-paper/50 text-altar-wood placeholder-altar-wood/30 block w-full rounded-lg border border-heritage-gold/20 shadow-sm focus:border-heritage-gold focus:ring-heritage-gold focus:bg-white pl-11 pr-4 py-3.5 transition-all duration-200 outline-none"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label
                    htmlFor="password"
                    className="block text-[13px] font-semibold text-heritage-red mb-1.5 ml-1"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative flex items-center group">
                    <KeyRound className="absolute left-3.5 size-5 text-altar-wood/30 group-focus-within:text-heritage-red transition-colors" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required
                      className="bg-rice-paper/50 text-altar-wood placeholder-altar-wood/30 block w-full rounded-lg border border-heritage-gold/20 shadow-sm focus:border-heritage-gold focus:ring-heritage-gold focus:bg-white pl-11 pr-4 py-3.5 transition-all duration-200 outline-none"
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative overflow-hidden"
                    >
                      <label
                        htmlFor="confirmPassword"
                        className="block text-[13px] font-semibold text-heritage-red mb-1.5 ml-1"
                      >
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative flex items-center group">
                        <KeyRound className="absolute left-3.5 size-5 text-altar-wood/30 group-focus-within:text-heritage-red transition-colors" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          required={!isLogin}
                          className="bg-rice-paper/50 text-altar-wood placeholder-altar-wood/30 block w-full rounded-lg border border-heritage-gold/20 shadow-sm focus:border-heritage-gold focus:ring-heritage-gold focus:bg-white pl-11 pr-4 py-3.5 transition-all duration-200 outline-none"
                          placeholder="Nhập lại mật khẩu"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="text-heritage-red text-[13px] text-center bg-heritage-red/5 p-3 rounded-lg border border-heritage-red/10 font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="text-jade-green text-[13px] text-center bg-jade-green/5 p-3 rounded-lg border border-jade-green/10 font-medium"
                  >
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 text-[15px] font-bold rounded-lg text-white bg-heritage-red hover:bg-heritage-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-heritage-red disabled:opacity-70 disabled:cursor-wait transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {loading ? (
                    <span className="flex items-center gap-2.5">
                      <svg
                        className="animate-spin -ml-1 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    <>
                      {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
                      {!isLogin && <UserPlus className="size-4 ml-1" />}
                    </>
                  )}
                </button>

                <div className="relative flex items-center py-2 opacity-60">
                  <div className="grow border-t border-heritage-gold/30"></div>
                  <span className="shrink-0 mx-4 text-altar-wood/40 text-[11px] uppercase tracking-wider font-bold">
                    Hoặc
                  </span>
                  <div className="grow border-t border-heritage-gold/30"></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isLogin && isDemo) {
                      setError(
                        "Đây là trang demo, bạn không cần phải tạo tài khoản. Hãy sử dụng tài khoản demo để truy cập với toàn bộ quyền.",
                      );
                      return;
                    }
                    setIsLogin(!isLogin);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full text-sm font-semibold text-heritage-red hover:text-heritage-red-dark bg-white hover:bg-rice-paper border border-heritage-gold/20 py-3.5 rounded-lg shadow-sm focus:outline-none transition-all duration-200"
                >
                  {isLogin
                    ? "Chưa có tài khoản? Đăng ký ngay"
                    : "Đã có tài khoản? Đăng nhập"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Trust badges */}
      <div className="flex justify-center gap-8 pb-10 relative z-10 px-6">
        {[
          { icon: <ShieldCheck className="size-5" />, text: "Bảo mật thông tin" },
          { icon: <TreePine className="size-5" />, text: "Dành riêng cho\nPhạm Phú" },
          { icon: <Zap className="size-5" />, text: "Đăng nhập nhanh" },
        ].map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-altar-wood/50 text-sm"
          >
            <span className="text-heritage-red/60">{badge.icon}</span>
            <span className="whitespace-pre-line">{badge.text}</span>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}

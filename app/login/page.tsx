"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Smartphone, TreePine, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SendOtpResponse = {
  error?: string;
  message?: string;
  maskedPhoneNumber?: string;
  resendAvailableIn?: number;
  traceId?: string;
};

type VerifyOtpResponse = {
  error?: string;
  remainingAttempts?: number;
  traceId?: string;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
  };
};

const OTP_LENGTH = 6;

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [maskedPhoneNumber, setMaskedPhoneNumber] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null,
  );
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setInfo("Phiên đăng nhập OTP đã hết hạn sau 30 ngày. Vui lòng đăng nhập lại.");
    } else if (searchParams.get("otp_required") === "1") {
      setInfo("Tài khoản thành viên cần đăng nhập bằng OTP số điện thoại.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!resendAvailableAt) {
      setCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((resendAvailableAt - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining === 0) {
        setResendAvailableAt(null);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const sendOtp = async (isResend = false) => {
    setLoadingSend(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = (await response.json()) as SendOtpResponse;
      if (!response.ok) {
        const traceSuffix = data.traceId ? ` [trace: ${data.traceId}]` : "";
        setError((data.error || "Không thể gửi OTP.") + traceSuffix);
        if (typeof data.resendAvailableIn === "number") {
          setResendAvailableAt(Date.now() + data.resendAvailableIn * 1000);
        }
        return;
      }

      setStep("otp");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setMaskedPhoneNumber(data.maskedPhoneNumber || phoneNumber);
      setResendAvailableAt(
        Date.now() + (data.resendAvailableIn || 30) * 1000,
      );
      setInfo(
        isResend ? "Đã gửi lại OTP." : data.message || "OTP đã được gửi thành công.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi OTP.");
    } finally {
      setLoadingSend(false);
    }
  };

  const verifyOtp = async () => {
    const otpCode = otpDigits.join("");
    if (otpCode.length !== OTP_LENGTH) {
      setError("Vui lòng nhập đủ 6 chữ số OTP.");
      return;
    }

    setLoadingVerify(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: otpCode }),
      });

      const data = (await response.json()) as VerifyOtpResponse;
      if (!response.ok || !data.session) {
        const traceSuffix = data.traceId ? ` [trace: ${data.traceId}]` : "";
        const attemptsText =
          typeof data.remainingAttempts === "number"
            ? ` Còn lại ${data.remainingAttempts} lượt thử.`
            : "";
        setError(
          (data.error || "Xác minh OTP thất bại.") + attemptsText + traceSuffix,
        );
        return;
      }

      const { accessToken, refreshToken } = data.session;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      setInfo("Xác thực thành công. Đang đăng nhập...");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác minh OTP thất bại.");
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleOtpChange = (index: number, rawValue: string) => {
    const onlyDigits = rawValue.replace(/\D/g, "");
    const nextDigits = [...otpDigits];

    if (!onlyDigits) {
      nextDigits[index] = "";
      setOtpDigits(nextDigits);
      return;
    }

    if (onlyDigits.length > 1) {
      const values = onlyDigits.slice(0, OTP_LENGTH).split("");
      const merged = Array(OTP_LENGTH)
        .fill("")
        .map((_, idx) => values[idx] || otpDigits[idx] || "");
      setOtpDigits(merged);

      const focusIndex = Math.min(values.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    nextDigits[index] = onlyDigits;
    setOtpDigits(nextDigits);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resetToPhoneStep = () => {
    setStep("phone");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    setInfo(null);
    setCountdown(0);
    setResendAvailableAt(null);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-rice-paper selection:bg-heritage-gold/30 selection:text-heritage-red">
      <Header siteName={config.siteName} />

      <div className="relative z-10 pt-12 pb-6 text-center">
        <h2 className="font-serif text-4xl font-black leading-tight text-heritage-red md:text-5xl">
          Kết Nối Cội Nguồn
        </h2>
        <p className="mt-3 text-lg italic text-altar-wood/60">
          &ldquo;Cây có cội, nước có nguồn. Chim có tổ, người có tông.&rdquo;
        </p>
      </div>

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16">
        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="relative bg-gradient-to-br from-heritage-red via-heritage-red-dark to-heritage-red p-8 pb-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-heritage-gold/10 to-transparent" />
            <div className="absolute top-0 right-0 left-0 h-1 bg-heritage-gold" />
            <div className="relative z-10 flex items-center gap-3">
              <Smartphone className="size-6 text-heritage-gold" />
              <h3 className="text-lg font-bold tracking-wide text-heritage-gold uppercase">
                Đăng nhập OTP
              </h3>
            </div>
          </div>

          <div className="border border-heritage-gold/10 bg-white p-8">
            {step === "phone" ? (
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendOtp(false);
                }}
              >
                <div>
                  <label
                    htmlFor="phone-number"
                    className="mb-1.5 ml-1 block text-[13px] font-semibold text-heritage-red"
                  >
                    Số điện thoại
                  </label>
                  <div className="group relative flex items-center">
                    <span className="absolute left-3.5 border-r border-heritage-gold/30 pr-2 text-sm font-semibold text-altar-wood/50">
                      (+84)
                    </span>
                    <input
                      id="phone-number"
                      type="tel"
                      autoComplete="tel"
                      required
                      className="block w-full rounded-lg border border-heritage-gold/20 bg-rice-paper/50 py-3.5 pr-4 pl-20 text-altar-wood placeholder-altar-wood/30 shadow-sm transition-all duration-200 outline-none focus:border-heritage-gold focus:bg-white focus:ring-heritage-gold"
                      placeholder="Nhập số điện thoại"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="rounded-lg border border-heritage-red/10 bg-heritage-red/5 p-3 text-center text-[13px] font-medium text-heritage-red"
                    >
                      {error}
                    </motion.div>
                  )}

                  {info && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="rounded-lg border border-jade-green/10 bg-jade-green/5 p-3 text-center text-[13px] font-medium text-jade-green"
                    >
                      {info}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loadingSend}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-heritage-red-dark hover:shadow-xl disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingSend ? "Đang gửi OTP..." : "Gửi mã OTP"}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold tracking-wide text-heritage-red uppercase">
                    Xác thực OTP
                  </h4>
                  <button
                    type="button"
                    onClick={resetToPhoneStep}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-heritage-red/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                  >
                    <ArrowLeft className="size-3.5" />
                    Đổi số điện thoại
                  </button>
                </div>

                <p className="text-center text-sm text-altar-wood/70">
                  Mã OTP đã gửi tới <strong>{maskedPhoneNumber}</strong>
                </p>

                <div className="flex justify-between gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      className="h-12 w-11 rounded-lg border-2 border-heritage-gold/30 bg-white text-center text-lg font-bold text-altar-wood outline-none transition-colors focus:border-heritage-red"
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={loadingVerify}
                  className="w-full rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingVerify ? "Đang xác thực..." : "Xác nhận"}
                </button>

                <button
                  type="button"
                  disabled={loadingSend || countdown > 0}
                  onClick={() => void sendOtp(true)}
                  className="w-full rounded-lg border border-heritage-gold/30 bg-white px-4 py-3 text-sm font-semibold text-heritage-red transition-colors hover:bg-rice-paper disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {countdown > 0
                    ? `Gửi lại OTP sau ${countdown}s`
                    : loadingSend
                      ? "Đang gửi lại..."
                      : "Gửi lại OTP"}
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="rounded-lg border border-heritage-red/10 bg-heritage-red/5 p-3 text-center text-[13px] font-medium text-heritage-red"
                    >
                      {error}
                    </motion.div>
                  )}

                  {info && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="rounded-lg border border-jade-green/10 bg-jade-green/5 p-3 text-center text-[13px] font-medium text-jade-green"
                    >
                      {info}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="relative my-6 flex items-center py-2 opacity-60">
              <div className="grow border-t border-heritage-gold/30" />
              <span className="mx-4 shrink-0 text-[11px] font-bold tracking-wider text-altar-wood/40 uppercase">
                Quản trị
              </span>
              <div className="grow border-t border-heritage-gold/30" />
            </div>

            <Link
              href="/admin-login"
              className="block w-full rounded-lg border border-heritage-gold/20 bg-white py-3.5 text-center text-sm font-semibold text-heritage-red shadow-sm transition-all duration-200 hover:bg-rice-paper hover:text-heritage-red-dark"
            >
              Đăng nhập quản trị bằng email
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex justify-center gap-8 px-6 pb-10">
        {[
          { icon: <ShieldCheck className="size-5" />, text: "Bảo mật thông tin" },
          { icon: <TreePine className="size-5" />, text: "Dành riêng cho\nPhạm Phú" },
          { icon: <Zap className="size-5" />, text: "Đăng nhập nhanh" },
        ].map((badge, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm text-altar-wood/50"
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

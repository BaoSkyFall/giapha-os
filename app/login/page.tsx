"use client";

import config from "@/app/config";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import SixDigitPasswordInput from "@/components/SixDigitPasswordInput";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { ArrowLeft, ShieldCheck, Smartphone, TreePine, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type AuthMode = "login" | "register" | "forgot_password";
type OtpStep = "credentials" | "otp";
type CredentialStep = "phone" | "password";

type SendOtpResponse = {
  error?: string;
  message?: string;
  maskedPhoneNumber?: string;
  resendAvailableIn?: number;
  traceId?: string;
};

type AuthResponse = {
  error?: string;
  traceId?: string;
  remainingAttempts?: number;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
  };
};

type PhoneCheckResponse = {
  ok?: boolean;
  exists?: boolean;
  canLogin?: boolean;
  error?: string;
  traceId?: string;
  retryAfterSeconds?: number;
};

const OTP_LENGTH = 6;
const PASSWORD_LENGTH = 6;

const modeLabels: Record<AuthMode, string> = {
  login: "Đăng nhập",
  register: "Đăng ký",
  forgot_password: "Quên mật khẩu",
};

const modeHeaderTitles: Record<AuthMode, string> = {
  login: "Đăng nhập bằng số điện thoại",
  register: "Đăng ký bằng số điện thoại",
  forgot_password: "Khôi phục bằng số điện thoại",
};

const modeDescriptions: Record<AuthMode, string> = {
  login: "Nhập số điện thoại và mật khẩu 6 số để đăng nhập.",
  register: "Nhập số điện thoại, tạo mật khẩu 6 số rồi xác thực OTP để đăng ký.",
  forgot_password: "Nhập số điện thoại, tạo mật khẩu mới 6 số và xác thực OTP.",
};

const passwordPlaceholder: Record<AuthMode, string> = {
  login: "Nhập mật khẩu 6 số",
  register: "Tạo mật khẩu 6 số",
  forgot_password: "Mật khẩu mới 6 số",
};

const resolveMode = (value: string | null): AuthMode => {
  if (value === "register" || value === "forgot_password") {
    return value;
  }
  return "login";
};

const isPhoneInputLikelyValid = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() =>
    resolveMode(searchParams.get("mode")),
  );
  const [step, setStep] = useState<OtpStep>("credentials");
  const [credentialStep, setCredentialStep] = useState<CredentialStep>("phone");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedPhoneNumber, setMaskedPhoneNumber] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [loadingPrimary, setLoadingPrimary] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showLoginRedirectScreen, setShowLoginRedirectScreen] = useState(false);
  const [passwordFieldError, setPasswordFieldError] = useState(false);

  const passwordLastAutoSubmittedRef = useRef("");
  const otpLastAutoSubmittedRef = useRef("");
  const passwordShakeControls = useAnimationControls();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const paramsNote = searchParams.get("admin_route_deprecated");
    if (paramsNote === "1") {
      setInfo("Đăng nhập quản trị đã chuyển sang số điện thoại + mật khẩu tại trang này.");
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

  const clearNotices = () => {
    setError(null);
    setInfo(null);
  };

  const buildModeHref = (nextMode: AuthMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === "login") {
      params.delete("mode");
    } else {
      params.set("mode", nextMode);
    }
    const query = params.toString();
    return query ? `/login?${query}` : "/login";
  };

  const resetOtpState = (nextCredentialStep: CredentialStep = "password") => {
    setStep("credentials");
    setCredentialStep(nextCredentialStep);
    setOtpCode("");
    setMaskedPhoneNumber("");
    setCountdown(0);
    setResendAvailableAt(null);
    otpLastAutoSubmittedRef.current = "";
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowLoginRedirectScreen(false);
    setPassword("");
    setConfirmPassword("");
    setPasswordFieldError(false);
    passwordLastAutoSubmittedRef.current = "";
    resetOtpState("phone");
    clearNotices();
  };

  const setPasswordAndClearError = (value: string) => {
    setPassword(value);
    if (passwordFieldError) {
      setPasswordFieldError(false);
    }
  };

  const setSessionAndRedirect = async (data: AuthResponse) => {
    if (!data.session) {
      throw new Error("Không thể tạo phiên đăng nhập.");
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.accessToken,
      refresh_token: data.session.refreshToken,
    });

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    setShowLoginRedirectScreen(true);
    setError(null);
    setInfo(null);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    router.replace("/dashboard");
    router.refresh();
  };

  const isPasswordValid = /^\d{6}$/.test(password);
  const isConfirmValid =
    mode === "login" || (confirmPassword.length > 0 && confirmPassword === password);

  const handleContinueAfterPhone = async () => {
    clearNotices();

    if (!isPhoneInputLikelyValid(phoneNumber)) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }

    if (mode === "login") {
      setLoadingPrimary(true);
      try {
        const response = await fetch("/api/auth/phone/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        });

        const data = (await response.json()) as PhoneCheckResponse;
        if (!response.ok) {
          setError(data.error || "Không thể kiểm tra số điện thoại.");
          return;
        }

        if (!data.exists) {
          setError("Số điện thoại chưa được đăng ký.");
          return;
        }

        if (!data.canLogin) {
          setError("Tài khoản chưa được kích hoạt.");
          return;
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể kiểm tra số điện thoại.",
        );
        return;
      } finally {
        setLoadingPrimary(false);
      }
    }

    setCredentialStep("password");
  };

  const sendOtp = async (isResend = false) => {
    setLoadingPrimary(true);
    clearNotices();

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, purpose: mode }),
      });

      const data = (await response.json()) as SendOtpResponse;
      if (!response.ok) {
        setError((data.error || "Không thể gửi OTP."));
        if (typeof data.resendAvailableIn === "number") {
          setResendAvailableAt(Date.now() + data.resendAvailableIn * 1000);
        }
        return;
      }

      setStep("otp");
      setOtpCode("");
      setMaskedPhoneNumber(data.maskedPhoneNumber || phoneNumber);
      setResendAvailableAt(Date.now() + (data.resendAvailableIn || 30) * 1000);
      setInfo(isResend ? "Đã gửi lại OTP." : data.message || "Đã gửi OTP.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi OTP.",
      );
    } finally {
      setLoadingPrimary(false);
    }
  };

  const submitLogin = async (explicitPassword?: string) => {
    const finalPassword = explicitPassword ?? password;
    setLoadingPrimary(true);
    setPasswordFieldError(false);
    clearNotices();

    try {
      const response = await fetch("/api/auth/phone/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password: finalPassword }),
      });

      const data = (await response.json()) as AuthResponse;
      if (!response.ok) {
        if (response.status === 401) {
          setPasswordFieldError(true);
          void passwordShakeControls.start({
            x: [0, -8, 8, -6, 6, 0],
            transition: { duration: 0.35, ease: "easeOut" },
          });
        }
        setError((data.error || "Đăng nhập thất bại."));
        return;
      }

      await setSessionAndRedirect(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Đăng nhập thất bại.",
      );
    } finally {
      setLoadingPrimary(false);
    }
  };

  const submitOtpFlow = async (explicitOtpCode?: string) => {
    const finalOtpCode = explicitOtpCode ?? otpCode;
    if (finalOtpCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số OTP.`);
      return;
    }

    setLoadingSecondary(true);
    clearNotices();

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          code: finalOtpCode,
          purpose: mode,
          password,
        }),
      });

      const data = (await response.json()) as AuthResponse;
      if (!response.ok) {
        const attemptsText =
          typeof data.remainingAttempts === "number"
            ? ` Còn lại ${data.remainingAttempts} lượt thử.`
            : "";
        setError((data.error || "Xác minh OTP thất bại.") + attemptsText);
        return;
      }

      await setSessionAndRedirect(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Xác minh OTP thất bại.",
      );
    } finally {
      setLoadingSecondary(false);
    }
  };

  const handlePrimarySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (credentialStep === "phone") {
      await handleContinueAfterPhone();
      return;
    }

    if (!isPasswordValid) {
      setError(`Mật khẩu phải gồm đúng ${PASSWORD_LENGTH} chữ số.`);
      return;
    }

    if (!isConfirmValid) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    if (mode === "login") {
      await submitLogin();
      return;
    }

    await sendOtp(false);
  };

  const tryAutoSubmitPasswordStep = (overrides?: {
    nextPassword?: string;
    nextConfirmPassword?: string;
  }) => {
    if (step !== "credentials" || credentialStep !== "password") return;
    if (loadingPrimary || loadingSecondary) return;

    const effectivePassword = overrides?.nextPassword ?? password;
    const effectiveConfirmPassword =
      overrides?.nextConfirmPassword ?? confirmPassword;

    if (mode === "login") {
      if (effectivePassword.length !== PASSWORD_LENGTH) return;

      const submissionKey = `${mode}:${phoneNumber}:${effectivePassword}`;
      if (passwordLastAutoSubmittedRef.current === submissionKey) return;
      passwordLastAutoSubmittedRef.current = submissionKey;
      void submitLogin(effectivePassword);
      return;
    }

    if (effectivePassword.length !== PASSWORD_LENGTH) return;
    if (effectiveConfirmPassword.length !== PASSWORD_LENGTH) return;
    if (effectivePassword !== effectiveConfirmPassword) return;

    const submissionKey = `${mode}:${phoneNumber}:${effectivePassword}:${effectiveConfirmPassword}`;
    if (passwordLastAutoSubmittedRef.current === submissionKey) return;
    passwordLastAutoSubmittedRef.current = submissionKey;
    void sendOtp(false);
  };

  const tryAutoSubmitOtp = (completedOtpCode: string) => {
    if (step !== "otp") return;
    if (loadingPrimary || loadingSecondary) return;
    if (completedOtpCode.length !== OTP_LENGTH) return;

    const submissionKey = `${mode}:${phoneNumber}:${completedOtpCode}`;
    if (otpLastAutoSubmittedRef.current === submissionKey) return;
    otpLastAutoSubmittedRef.current = submissionKey;
    void submitOtpFlow(completedOtpCode);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-rice-paper selection:bg-heritage-gold/30 selection:text-heritage-red">
      <Header siteName={config.siteName} />

      <div className="relative z-10 pt-12 pb-6 text-center">
        <h2 className="font-serif text-4xl font-black leading-tight text-heritage-red md:text-5xl">
          Kết Nối Cội Nguồn
        </h2>
        <p className="mt-3 px-2 text-lg italic text-altar-wood/60">
          Cây có cội, nước có nguồn. Chim có tổ, người có tông.
        </p>
      </div>

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16">
        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="relative bg-gradient-to-br from-heritage-red via-heritage-red-dark to-heritage-red p-5 pb-4 sm:p-8 sm:pb-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-heritage-gold/10 to-transparent" />
            <div className="absolute top-0 right-0 left-0 h-1 bg-heritage-gold" />
            <div className="relative z-10 flex items-center gap-3">
              <Smartphone className="size-6 text-heritage-gold" />
              <h3 className="text-md font-bold tracking-wide text-heritage-gold uppercase">
                {modeHeaderTitles[mode]}
              </h3>
            </div>
          </div>

         <div className="border border-heritage-gold/10 bg-white p-5 sm:p-8">
             {mode == "register" && <div className="mb-5 rounded-lg border border-heritage-gold/20 bg-rice-paper p-3.5">
              <h4 className="text-sm font-bold tracking-wide text-heritage-red uppercase">
                {modeLabels[mode]} 
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-altar-wood/70">
                {modeDescriptions[mode]}
              </p>
            </div>}

            {showLoginRedirectScreen ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="size-10 border-4 border-heritage-red border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold tracking-wide text-heritage-red">
                  Login sucessfull, Redirecting ...
                </p>
              </div>
            ) : (
              <>
            {step === "credentials" && (
              <form className="space-y-5" onSubmit={(event) => void handlePrimarySubmit(event)}>
                <AnimatePresence initial={false} mode="wait">
                  {credentialStep === "phone" ? (
                    <motion.div
                      key="phone-step"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-5"
                    >
                      <div>
                        {/* <label
                          htmlFor="phone-number"
                          className="mb-1.5 ml-1 block text-[13px] font-semibold text-heritage-red"
                        >
                          Số điện thoại
                        </label> */}
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

                      <button
                        type="submit"
                        disabled={loadingPrimary}
                        className="w-full rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
                      >
                        {loadingPrimary ? "Đang xử lý..." : "Tiếp tục"}
                      </button>
                      {mode === "login" ? (
                        <p className="text-center text-sm text-altar-wood/70">
                          Chưa có tài khoản?{" "}
                          <Link
                            href={buildModeHref("register")}
                            onClick={() => switchMode("register")}
                            className="font-semibold text-heritage-red underline underline-offset-4 transition-colors hover:text-heritage-red-dark"
                          >
                            Đăng ký
                          </Link>
                        </p>
                      ) : (
                        <p className="text-center text-sm text-altar-wood/70">
                          Đã có tài khoản?{" "}
                          <Link
                            href={buildModeHref("login")}
                            onClick={() => switchMode("login")}
                            className="font-semibold text-heritage-red underline underline-offset-4 transition-colors hover:text-heritage-red-dark"
                          >
                            Đăng nhập
                          </Link>
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="password-step"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="space-y-5"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            clearNotices();
                            setPasswordFieldError(false);
                            setCredentialStep("phone");
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-heritage-red/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                        >
                          <ArrowLeft className="size-3.5" />
                          Đổi số điện thoại
                        </button>
                        <span className="text-xs text-altar-wood/60">{phoneNumber}</span>
                      </div>

                      <div>
                        <div className="mb-1.5 ml-1 flex items-center justify-between">
                          <label className="block text-[13px] font-semibold text-heritage-red">
                            Mật khẩu 6 số
                          </label>
                          {mode === "login" ? (
                            <Link
                              href={buildModeHref("forgot_password")}
                              onClick={() => switchMode("forgot_password")}
                              className="text-xs font-semibold text-heritage-red/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                            >
                              Quên mật khẩu?
                            </Link>
                          ) : null}
                        </div>
                        <motion.div
                          animate={passwordShakeControls}
                          initial={{ x: 0 }}
                          className={`rounded-xl border bg-rice-paper/40 p-2.5 sm:p-3.5 ${
                            passwordFieldError
                              ? "border-heritage-red/50"
                              : "border-heritage-gold/20"
                          }`}
                        >
                          <SixDigitPasswordInput
                            idPrefix="password"
                            value={password}
                            onChange={setPasswordAndClearError}
                            onComplete={(value) => {
                              void tryAutoSubmitPasswordStep({
                                nextPassword: value,
                              });
                            }}
                            hasError={passwordFieldError}
                            disabled={loadingPrimary || loadingSecondary}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            autoFocus
                          />
                        </motion.div>
                          <p className="mt-2 ml-1 text-xs text-altar-wood/60">{passwordPlaceholder[mode]}</p>
                      </div>

                      {mode !== "login" && (
                        <div>
                          <label className="mb-1.5 ml-1 block text-[13px] font-semibold text-heritage-red">
                            Xác nhận mật khẩu
                          </label>
                          <div className="rounded-xl border border-heritage-gold/20 bg-rice-paper/40 p-2.5 sm:p-3.5">
                            <SixDigitPasswordInput
                              idPrefix="confirm-password"
                              value={confirmPassword}
                              onChange={setConfirmPassword}
                              onComplete={(value) => {
                                void tryAutoSubmitPasswordStep({
                                  nextConfirmPassword: value,
                                });
                              }}
                              disabled={loadingPrimary || loadingSecondary}
                              autoComplete="new-password"
                            />
                          </div>
                          <p className="mt-2 ml-1 text-xs text-altar-wood/60">
                            Nhập lại mật khẩu 6 số để xác nhận.
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loadingPrimary}
                        className="w-full rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
                      >
                        {mode === "login"
                          ? loadingPrimary
                            ? "Đang đăng nhập..."
                            : "Đăng nhập"
                          : loadingPrimary
                            ? "Đang gửi OTP..."
                            : "Gửi mã OTP"}
                      </button>

                      {mode === "login" ? (
                        <p className="text-center text-sm text-altar-wood/70">
                          Chưa có tài khoản?{" "}
                          <Link
                            href={buildModeHref("register")}
                            onClick={() => switchMode("register")}
                            className="font-semibold text-heritage-red underline underline-offset-4 transition-colors hover:text-heritage-red-dark"
                          >
                            Đăng ký
                          </Link>
                        </p>
                      ) : (
                        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                          <Link
                            href={buildModeHref("login")}
                            onClick={() => switchMode("login")}
                            className="font-semibold text-heritage-red underline underline-offset-4 transition-colors hover:text-heritage-red-dark"
                          >
                            Đã có tài khoản? Đăng nhập
                          </Link>
                          {mode === "register" ? (
                            <Link
                              href={buildModeHref("forgot_password")}
                              onClick={() => switchMode("forgot_password")}
                              className="font-semibold text-altar-wood/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                            >
                              Quên mật khẩu?
                            </Link>
                          ) : (
                            <Link
                              href={buildModeHref("register")}
                              onClick={() => switchMode("register")}
                              className="font-semibold text-altar-wood/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                            >
                              Chưa có tài khoản?
                            </Link>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            )}

            {step === "otp" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold tracking-wide text-heritage-red uppercase">
                    Xác thực OTP - {modeLabels[mode]}
                  </h4>
                  <button
                    type="button"
                    onClick={() => resetOtpState("password")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-heritage-red/80 underline underline-offset-4 transition-colors hover:text-heritage-red"
                  >
                    <ArrowLeft className="size-3.5" />
                    Quay lại
                  </button>
                </div>

                <p className="text-center text-sm text-altar-wood/70">
                  Mã OTP đã gửi tới <strong>{maskedPhoneNumber}</strong>
                </p>

                <div className="rounded-xl border border-heritage-gold/20 bg-rice-paper/40 p-2.5 sm:p-3.5">
                  <SixDigitPasswordInput
                    idPrefix="otp"
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={(value) => {
                      void tryAutoSubmitOtp(value);
                    }}
                    disabled={loadingPrimary || loadingSecondary}
                    autoComplete="one-time-code"
                    masked={false}
                    ariaLabelPrefix="OTP số"
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void submitOtpFlow()}
                  disabled={loadingSecondary}
                  className="w-full rounded-lg bg-heritage-red px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingSecondary ? "Đang xác thực..." : "Xác nhận"}
                </button>

                <button
                  type="button"
                  disabled={loadingPrimary || countdown > 0}
                  onClick={() => void sendOtp(true)}
                  className="w-full rounded-lg border border-heritage-gold/30 bg-white px-4 py-3 text-sm font-semibold text-heritage-red transition-colors hover:bg-rice-paper disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {countdown > 0
                    ? `Gửi lại OTP sau ${countdown}s`
                    : loadingPrimary
                      ? "Đang gửi lại..."
                      : "Gửi lại OTP"}
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mt-5 rounded-lg border border-heritage-red/10 bg-heritage-red/5 p-3 text-center text-[13px] font-medium text-heritage-red"
                >
                  {error}
                </motion.div>
              )}

              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mt-5 rounded-lg border border-jade-green/10 bg-jade-green/5 p-3 text-center text-[13px] font-medium text-jade-green"
                >
                  {info}
                </motion.div>
              )}
            </AnimatePresence>
              </>
            )}
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

"use client";

import SixDigitPasswordInput from "@/components/SixDigitPasswordInput";
import { useState } from "react";

type ChangePasswordResponse = {
  ok?: boolean;
  error?: string;
  traceId?: string;
  message?: string;
};

const PASSWORD_LENGTH = 6;

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(currentPassword) || !/^\d{6}$/.test(newPassword)) {
      setError(`Mat khau phai gom dung ${PASSWORD_LENGTH} chu so.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xac nhan mat khau moi khong khop.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = (await response.json()) as ChangePasswordResponse;
      if (!response.ok) {
        const traceSuffix = data.traceId ? ` [trace: ${data.traceId}]` : "";
        setError((data.error || "Doi mat khau that bai.") + traceSuffix);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(data.message || "Da doi mat khau thanh cong.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Doi mat khau that bai.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-heritage-gold/20 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-altar-wood">Doi mat khau</h1>
        <p className="mt-2 text-sm text-altar-wood/70">
          Mat khau phai gom dung 6 chu so. Ban can nhap mat khau hien tai de xac nhan.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label
              className="mb-1 block text-sm font-semibold text-heritage-red"
            >
              Mat khau hien tai
            </label>
            <div className="rounded-xl border border-heritage-gold/30 bg-rice-paper/40 p-3">
              <SixDigitPasswordInput
                idPrefix="current-password"
                autoFocus
                disabled={loading}
                length={PASSWORD_LENGTH}
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-heritage-red"
            >
              Mat khau moi
            </label>
            <div className="rounded-xl border border-heritage-gold/30 bg-rice-paper/40 p-3">
              <SixDigitPasswordInput
                idPrefix="new-password"
                disabled={loading}
                length={PASSWORD_LENGTH}
                autoComplete="new-password"
                value={newPassword}
                onChange={setNewPassword}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-heritage-red"
            >
              Xac nhan mat khau moi
            </label>
            <div className="rounded-xl border border-heritage-gold/30 bg-rice-paper/40 p-3">
              <SixDigitPasswordInput
                idPrefix="confirm-password"
                disabled={loading}
                length={PASSWORD_LENGTH}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-heritage-red/20 bg-heritage-red/5 p-3 text-sm font-medium text-heritage-red">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-jade-green/20 bg-jade-green/5 p-3 text-sm font-medium text-jade-green">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-heritage-red px-4 py-3 font-semibold text-white transition-colors hover:bg-heritage-red-dark disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Dang cap nhat..." : "Cap nhat mat khau"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type CompleteProfileResponse = {
  ok?: boolean;
  error?: string;
  traceId?: string;
};

type CompleteProfileClientProps = {
  branchOptions: string[];
  generationOptions: number[];
  initialProfile: {
    fullName: string;
    birthYear: number | null;
    birthMonth: number | null;
    birthDay: number | null;
    branch: string;
    generation: number | null;
    address: string;
  };
};

type FieldErrors = {
  fullName?: string;
  birthYear?: string;
  birthMonth?: string;
  birthDay?: string;
  branch?: string;
  generation?: string;
};

const getFirstFieldError = (errors: FieldErrors) =>
  errors.fullName ||
  errors.birthYear ||
  errors.birthMonth ||
  errors.birthDay ||
  errors.branch ||
  errors.generation ||
  null;

export default function CompleteProfileClient({
  branchOptions,
  generationOptions,
  initialProfile,
}: CompleteProfileClientProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [birthYear, setBirthYear] = useState<number | "">(
    initialProfile.birthYear ?? "",
  );
  const [birthMonth, setBirthMonth] = useState<number | "">(
    initialProfile.birthMonth ?? "",
  );
  const [birthDay, setBirthDay] = useState<number | "">(
    initialProfile.birthDay ?? "",
  );
  const [branch, setBranch] = useState(initialProfile.branch);
  const [generation, setGeneration] = useState<number | "">(
    initialProfile.generation ?? "",
  );
  const [address, setAddress] = useState(initialProfile.address);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const normalizedBranches = useMemo(
    () => Array.from(new Set(branchOptions)),
    [branchOptions],
  );

  const normalizedGenerations = useMemo(() => {
    const baseGenerations = Array.from(new Set(generationOptions)).sort(
      (a, b) => a - b,
    );
    const maxGeneration = baseGenerations[baseGenerations.length - 1] ?? 0;

    const extendedGenerations = [
      ...baseGenerations,
      maxGeneration + 1,
      maxGeneration + 2,
      maxGeneration + 3,
    ];

    return Array.from(new Set(extendedGenerations)).sort((a, b) => a - b);
  }, [generationOptions]);

  const fieldErrors = useMemo(() => {
    const errors: FieldErrors = {};

    if (!fullName.trim()) {
      errors.fullName = "Họ và tên là bắt buộc.";
    }

    if (
      typeof birthYear !== "number" ||
      !Number.isInteger(birthYear) ||
      birthYear < 1900 ||
      birthYear > 2100
    ) {
      errors.birthYear = "Năm sinh phải trong khoảng 1900-2100.";
    }

    if (
      birthMonth !== "" &&
      (typeof birthMonth !== "number" ||
        !Number.isInteger(birthMonth) ||
        birthMonth < 1 ||
        birthMonth > 12)
    ) {
      errors.birthMonth = "Tháng sinh phải trong khoảng 1-12.";
    }

    if (
      birthDay !== "" &&
      (typeof birthDay !== "number" ||
        !Number.isInteger(birthDay) ||
        birthDay < 1 ||
        birthDay > 31)
    ) {
      errors.birthDay = "Ngày sinh phải trong khoảng 1-31.";
    }

    if (birthDay !== "" && birthMonth === "") {
      errors.birthMonth = "Cần chọn tháng nếu có ngày sinh.";
    }

    if (
      birthDay !== "" &&
      birthMonth !== "" &&
      typeof birthYear === "number" &&
      Number.isInteger(birthYear) &&
      birthYear >= 1900 &&
      birthYear <= 2100
    ) {
      const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
      if (birthDay > daysInMonth) {
        errors.birthDay = "Ngày sinh không tồn tại trong tháng đã chọn.";
      }
    }

    if (!branch.trim()) {
      errors.branch = "Nhánh là bắt buộc.";
    }

    if (
      typeof generation !== "number" ||
      !Number.isInteger(generation) ||
      generation < 1 ||
      generation > 30
    ) {
      errors.generation = "Đời thứ phải trong khoảng 1-15.";
    }

    return errors;
  }, [fullName, birthYear, birthMonth, birthDay, branch, generation]);

  const hasValidationErrors = Object.keys(fieldErrors).length > 0;
  const disableSubmit = submitting || (hasSubmitted && hasValidationErrors);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setInfo(null);

    if (hasValidationErrors) {
      setError(
        getFirstFieldError(fieldErrors) ||
          "Vui lòng kiểm tra lại thông tin bắt buộc.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/profile/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          birthYear: birthYear === "" ? null : birthYear,
          birthMonth: birthMonth === "" ? null : birthMonth,
          birthDay: birthDay === "" ? null : birthDay,
          branch,
          generation: generation === "" ? null : generation,
          address,
        }),
      });

      const data = (await response.json()) as CompleteProfileResponse;
      if (!response.ok || !data.ok) {
        const traceSuffix = data.traceId ? ` [mã trace: ${data.traceId}]` : "";
        setError(
          (data.error || "Không thể cập nhật thông tin.") + traceSuffix,
        );
        return;
      }

      setInfo("Đã cập nhật thông tin. Đang chuyển vào hệ thống...");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi không xác định.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Hoàn tất hồ sơ</h1>
        <p className="mt-2 text-sm text-stone-600">
          Vui lòng cập nhật thông tin trước khi truy cập hệ thống.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-stone-700">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(hasSubmitted && fieldErrors.fullName)}
            className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            placeholder="Nhập họ và tên"
          />
          {hasSubmitted && fieldErrors.fullName && (
            <p className="mt-1 text-xs font-medium text-rose-700">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-stone-700">
            Ngày sinh <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="number"
                min={1900}
                max={2100}
                value={birthYear}
                onChange={(event) =>
                  setBirthYear(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                aria-invalid={Boolean(hasSubmitted && fieldErrors.birthYear)}
                className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Năm *"
              />
            </div>
            <div>
              <input
                type="number"
                min={1}
                max={12}
                value={birthMonth}
                onChange={(event) =>
                  setBirthMonth(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
                aria-invalid={Boolean(hasSubmitted && fieldErrors.birthMonth)}
                className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Tháng"
              />
            </div>
            <div>
              <input
                type="number"
                min={1}
                max={31}
                value={birthDay}
                onChange={(event) =>
                  setBirthDay(event.target.value ? Number(event.target.value) : "")
                }
                aria-invalid={Boolean(hasSubmitted && fieldErrors.birthDay)}
                className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Ngày"
              />
            </div>
          </div>
          {hasSubmitted &&
            (fieldErrors.birthYear || fieldErrors.birthMonth || fieldErrors.birthDay) && (
              <p className="mt-1 text-xs font-medium text-rose-700">
                {fieldErrors.birthYear ||
                  fieldErrors.birthMonth ||
                  fieldErrors.birthDay}
              </p>
            )}
          <p className="mt-1.5 text-xs text-stone-500">
            Bắt buộc năm sinh. Tháng/ngày có thể để trống.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">
              Nhánh <span className="text-red-500">*</span>
            </label>
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              aria-invalid={Boolean(hasSubmitted && fieldErrors.branch)}
              className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">Chọn nhánh</option>
              {normalizedBranches.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {hasSubmitted && fieldErrors.branch && (
              <p className="mt-1 text-xs font-medium text-rose-700">
                {fieldErrors.branch}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-stone-700">
              Đời thứ <span className="text-red-500">*</span>
            </label>
            <select
              value={generation}
              onChange={(event) =>
                setGeneration(
                  event.target.value ? Number(event.target.value) : "",
                )
              }
              aria-invalid={Boolean(hasSubmitted && fieldErrors.generation)}
              className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">Chọn đời thứ</option>
              {normalizedGenerations.map((item) => (
                <option key={item} value={item}>
                  Đời {item}
                </option>
              ))}
            </select>
            {hasSubmitted && fieldErrors.generation && (
              <p className="mt-1 text-xs font-medium text-rose-700">
                {fieldErrors.generation}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-stone-700">
            Địa chỉ
          </label>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="block w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            placeholder="Không bắt buộc"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={disableSubmit}
          className="inline-flex w-full items-center justify-center rounded-xl bg-heritage-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-heritage-red-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Đang lưu..." : "Lưu và tiếp tục"}
        </button>
      </form>
    </div>
  );
}

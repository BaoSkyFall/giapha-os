"use client";

import { useMemo, useRef } from "react";

type SixDigitPasswordInputProps = {
  value: string;
  onChange: (nextValue: string) => void;
  length?: number;
  disabled?: boolean;
  idPrefix?: string;
  autoFocus?: boolean;
  autoComplete?: string;
};

const toDigits = (input: string, length: number) =>
  input.replace(/\D/g, "").slice(0, length);

export default function SixDigitPasswordInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  idPrefix = "pin",
  autoFocus = false,
  autoComplete = "off",
}: SixDigitPasswordInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => {
    const normalized = toDigits(value, length);
    return Array.from({ length }, (_, index) => normalized[index] || "");
  }, [length, value]);

  const updateDigits = (nextDigits: string[]) => {
    onChange(nextDigits.join(""));
  };

  const handleChange = (index: number, rawValue: string) => {
    const sanitized = rawValue.replace(/\D/g, "");
    const nextDigits = [...digits];

    if (!sanitized) {
      nextDigits[index] = "";
      updateDigits(nextDigits);
      return;
    }

    if (sanitized.length > 1) {
      const merged = [...digits];
      const values = sanitized.slice(0, length).split("");
      for (let offset = 0; offset < values.length; offset += 1) {
        const target = index + offset;
        if (target >= length) break;
        merged[target] = values[offset] || "";
      }
      updateDigits(merged);
      const focusTarget = Math.min(index + values.length, length - 1);
      inputRefs.current[focusTarget]?.focus();
      return;
    }

    nextDigits[index] = sanitized;
    updateDigits(nextDigits);
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    const sanitized = toDigits(pasted, length);
    if (!sanitized) return;

    const merged = [...digits];
    const values = sanitized.split("");
    for (let offset = 0; offset < values.length; offset += 1) {
      const target = index + offset;
      if (target >= length) break;
      merged[target] = values[offset] || "";
    }
    updateDigits(merged);
    const focusTarget = Math.min(index + values.length, length - 1);
    inputRefs.current[focusTarget]?.focus();
  };

  return (
    <div className="flex justify-between gap-2.5 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={`${idPrefix}-${index}`}
          id={`${idPrefix}-${index}`}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="password"
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          className="h-12 w-11 rounded-xl border-2 border-heritage-gold/30 bg-white text-center text-lg font-semibold text-altar-wood outline-none transition-colors focus:border-heritage-red disabled:cursor-not-allowed disabled:opacity-60 sm:h-13 sm:w-12"
          aria-label={`Mat khau so ${index + 1}`}
        />
      ))}
    </div>
  );
}

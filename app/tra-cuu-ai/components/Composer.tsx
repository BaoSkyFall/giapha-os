"use client";

import { useState, useRef } from "react";
import { SendHorizontal, Square, RotateCcw } from "lucide-react";

const MAX_LENGTH = 1000;

interface ComposerProps {
  isThinking: boolean;
  hasError: boolean;
  onSend: (message: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}

export default function Composer({
  isThinking,
  hasError,
  onSend,
  onCancel,
  onRetry,
}: ComposerProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = input.trim();
  const isOverLimit = input.length > MAX_LENGTH;
  const canSend = trimmed.length > 0 && !isThinking && !isOverLimit;

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="shrink-0 border-t border-[#E8E2D8] bg-[#FAF8F3] pt-3 px-4 sm:px-6 lg:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-[900px] mx-auto w-full space-y-2">
        {hasError && !isThinking && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#FDF2F2] border border-[#A91E22]/25 text-xs text-[#A91E22]">
            <span>Yêu cầu trước đó chưa hoàn tất. Bạn có thể thử gửi lại.</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#A91E22] text-white font-medium hover:bg-[#8C171B] transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Thử lại
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-[#FFFFFF] border border-[#D6CEC0] focus-within:border-[#A91E22] rounded-2xl p-2 shadow-xs transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tên thành viên, câu hỏi quan hệ hoặc sự kiện dòng họ..."
            disabled={isThinking}
            className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm sm:text-base text-[#292725] placeholder:text-[#8A8378] focus:outline-none max-h-40 disabled:opacity-60"
          />

          {isThinking ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-3.5 rounded-xl bg-[#292725] hover:bg-[#5C5750] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors shrink-0"
              aria-label="Hủy tra cứu"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Hủy</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="h-10 px-4 rounded-xl bg-[#A91E22] hover:bg-[#8C171B] disabled:bg-[#E8E2D8] disabled:text-[#8A8378] text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
              aria-label="Gửi câu hỏi"
            >
              <SendHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-[#8A8378]">
          <span>Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
          <span className={isOverLimit ? "text-[#A91E22] font-semibold" : ""}>
            {input.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}

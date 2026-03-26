"use client";

import { FAQ_CHIPS, type FaqChip } from "./data";
import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, StreamChunk } from "@/types/ai-advisor";

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialSessions: Session[];
}



const STEP_LABELS: Record<string, string> = {
  parsing: "Phân tích câu hỏi",
  searching: "Truy vấn cơ sở dữ liệu",
  verifying: "Xác minh danh tính",
  narrating: "Tổng hợp hồ sơ thành viên",
};

const ALL_STEPS = ["parsing", "searching", "verifying", "narrating"];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-[70%] bg-white shadow-md rounded-2xl rounded-tr-none p-4 border-r-4 border-[#E8B931]">
        <p className="text-[#201212] leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function AiMessage({
  content,
  subjectId,
}: {
  content: string;
  subjectId?: string;
}) {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
      <div className="max-w-[80%] flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#B31D1D] flex items-center justify-center shadow-lg border-2 border-[#E8B931]/30">
            <span className="material-symbols-outlined text-white text-xl">
              temple_buddhist
            </span>
          </div>
        </div>
        <div className="bg-white shadow-xl rounded-2xl rounded-tl-none overflow-hidden border-t-4 border-[#B31D1D]">
          <div className="h-1 bg-gradient-to-r from-[#E8B931] via-[#B31D1D] to-[#E8B931] opacity-50" />
          <div className="p-5">
            <div className="text-[#201212] leading-relaxed space-y-2">
              {lines.map((line, i) =>
                line.startsWith("- ") ? (
                  <li key={i} className="flex items-start gap-3 list-none">
                    <span className="w-5 h-5 rounded-full bg-[#E8B931]/20 flex items-center justify-center mt-0.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#E8B931]" />
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: line
                          .slice(2)
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                      }}
                    />
                  </li>
                ) : (
                  <p
                    key={i}
                    dangerouslySetInnerHTML={{
                      __html: line.replace(
                        /\*\*(.*?)\*\*/g,
                        "<strong>$1</strong>"
                      ),
                    }}
                  />
                )
              )}
            </div>
            {subjectId && (
              <a
                href={`/dashboard/members/${subjectId}`}
                className="inline-flex items-center gap-2 text-[#B31D1D] font-bold text-sm mt-4 hover:underline decoration-[#E8B931] decoration-2 underline-offset-4"
              >
                Xem trong cây gia phả
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingState({ steps }: { steps: string[] }) {
  return (
    <div className="flex justify-start animate-in fade-in duration-500">
      <div className="max-w-[80%] flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#B31D1D]/20 flex items-center justify-center border-2 border-[#B31D1D]/10">
            <span className="material-symbols-outlined text-[#B31D1D] text-xl animate-pulse">
              psychology
            </span>
          </div>
        </div>
        <div className="bg-[#F1EDE2]/50 border border-[#E8B931]/10 p-4 rounded-2xl rounded-tl-none">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-[#B31D1D] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-[#B31D1D] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-[#B31D1D] rounded-full animate-bounce" />
            </div>
            <span className="text-xs font-medium italic">
              Đang tìm kiếm trong gia phả...
            </span>
          </div>
          {steps.length > 0 && (
            <div className="flex flex-col gap-1.5 border-l border-[#B31D1D]/30 pl-3">
              {ALL_STEPS.map((step) => {
                const idx = steps.indexOf(step);
                if (idx === -1) return null;
                const isLast = idx === steps.length - 1;
                const done = !isLast;
                return (
                  <div key={step} className="flex items-center gap-2">
                    {done ? (
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">
                        check_circle
                      </span>
                    ) : (
                      <span className="w-3 h-3 border-2 border-[#B31D1D] border-t-transparent rounded-full animate-spin" />
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold ${done ? "text-slate-400" : "text-[#B31D1D]"
                        }`}
                    >
                      {STEP_LABELS[step] ?? step}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatInput({
  onSend,
  onFaq,
  disabled,
}: {
  onSend: (msg: string) => void;
  onFaq: (chip: FaqChip) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-6 bg-[#FFFCF5] border-t border-[#E8B931]/20 flex-shrink-0">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {FAQ_CHIPS.slice(0, 4).map((chip) => (
            <button
              key={chip.question}
              onClick={() => onFaq(chip)}
              disabled={disabled}
              className="px-4 py-1.5 rounded-full bg-white border border-[#E8B931]/30 text-xs font-medium text-slate-600 hover:border-[#B31D1D] hover:text-[#B31D1D] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center group">
          <div className="absolute left-4 flex items-center text-[#B31D1D]/40 group-focus-within:text-[#B31D1D] transition-colors pointer-events-none">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <input
            id="ai-chat-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            placeholder="Hỏi về bất kỳ thành viên, sự kiện hoặc lịch sử tộc Phạm Phú..."
            className="w-full pl-12 pr-16 py-4 bg-white rounded-2xl border-2 border-[#E8B931]/20 focus:border-[#B31D1D] focus:outline-none shadow-lg transition-all text-[#201212] disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="absolute right-3 p-2 bg-[#B31D1D] text-white rounded-xl shadow-md hover:bg-[#93000C] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="Gửi"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 font-medium tracking-wider">
          THÔNG TIN AI CUNG CẤP CÓ THỂ CẦN ĐƯỢC XÁC MINH VỚI TRƯỞNG TỘC
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function AiAdvisorClient({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    undefined
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/sessions");
      if (res.ok) {
        const { sessions: s } = await res.json();
        setSessions(s ?? []);
      }
    } catch (err) {
      console.error({ err }, "Failed to refresh sessions");
    }
  }, []);

  const handleNewSession = useCallback(() => {
    setActiveSessionId(undefined);
    setMessages([]);
    setAgentSteps([]);
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setAgentSteps([]);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (res.ok) {
        const { session } = await res.json();
        setMessages((session.messages as ChatMessage[]) ?? []);
      }
    } catch (err) {
      console.error({ err }, "Failed to load session");
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(undefined);
          setMessages([]);
        }
      } catch (err) {
        console.error({ err }, "Failed to delete session");
      }
    },
    [activeSessionId]
  );

  /** FAQ chips: inject question + pre-written answer directly, no AI call. */
  const handleFaq = useCallback((chip: FaqChip) => {
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: chip.question, timestamp: now },
      { role: "assistant", content: chip.answer, timestamp: now },
    ]);
  }, []);

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isThinking) return;

      const newUserMsg: ChatMessage = {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newUserMsg]);
      setIsThinking(true);
      setAgentSteps([]);

      let accumulatedText = "";
      let resolvedSubjectId: string | undefined;
      let finalSessionId: string | undefined = activeSessionId;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            session_id: activeSessionId,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(trimmed);
            } catch {
              continue;
            }

            if (chunk.type === "agent_step") {
              setAgentSteps((prev) => [...prev, chunk.step]);
            } else if (chunk.type === "text") {
              accumulatedText += chunk.delta;
            } else if (chunk.type === "clarify") {
              accumulatedText = chunk.question;
            } else if (chunk.type === "done") {
              if (chunk.sessionId && chunk.sessionId !== "unknown") {
                finalSessionId = chunk.sessionId;
                setActiveSessionId(chunk.sessionId);
              }
              if (chunk.subject?.id) resolvedSubjectId = chunk.subject.id;
            } else if (chunk.type === "error") {
              accumulatedText = `⚠️ ${chunk.message}`;
            }
          }
        }

        if (accumulatedText) {
          const aiMsg: ChatMessage = {
            role: "assistant",
            content: accumulatedText,
            timestamp: new Date().toISOString(),
            ...(resolvedSubjectId ? { subject_id: resolvedSubjectId } : {}),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }

        if (finalSessionId) await refreshSessions();
      } catch (error) {
        console.error({ error }, "handleSend streaming failed");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Có lỗi kết nối. Vui lòng thử lại.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsThinking(false);
        setAgentSteps([]);
      }
    },
    [isThinking, activeSessionId, refreshSessions]
  );

  // ─────────────────────────────────────────────────────────────
  // Render — no sidebar, fills flex space between Header & Footer
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F7F3EA]">
      {/* ── Sub-header bar ── */}
      <div className="flex-shrink-0 border-b-2 border-[#E8B931]/20 bg-[#F7F3EA] shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">

            <div>
              <h1
                className="text-[#B31D1D] italic text-lg font-bold leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Trợ lý AI Tộc Phạm Phú
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[0.6rem] font-bold text-emerald-600 uppercase tracking-widest">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Session selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B31D1D] text-white text-sm font-medium hover:bg-[#93000C] transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Phiên mới
            </button>
            {sessions.length > 0 && (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E8B931]/30 bg-white text-sm text-slate-600 hover:border-[#B31D1D] hover:text-[#B31D1D] transition-all shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  <span className="hidden sm:inline">
                    {activeSessionId
                      ? (sessions.find((s) => s.id === activeSessionId)?.title ?? "Phiên hiện tại")
                      : "Lịch sử"}
                  </span>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-stone-200/60 py-2 z-50 hidden group-hover:block">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${session.id === activeSessionId
                        ? "bg-[#F7F3EA] text-[#B31D1D] font-semibold"
                        : "text-slate-600 hover:bg-[#F7F3EA]/50"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0">
                        history
                      </span>
                      <span className="text-sm truncate flex-1">
                        {session.title ?? "Phiên mới"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        title="Xoá phiên"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chat Canvas ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 min-h-full">
          {/* Lotus watermark */}
          <svg
            className="absolute bottom-0 right-0 opacity-5 w-[320px] pointer-events-none"
            fill="currentColor"
            viewBox="0 0 100 100"
          >
            <path
              d="M50 0C53 20 65 30 80 35C65 40 53 50 50 70C47 50 35 40 20 35C35 30 47 20 50 0Z"
              fill="#B31D1D"
            />
            <path
              d="M50 30C52 40 60 45 70 47C60 50 52 55 50 65C48 55 40 50 30 47C40 45 48 40 50 30Z"
              fill="#E8B931"
            />
          </svg>

          {/* Empty state */}
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
              <div className="w-20 h-20 rounded-full bg-[#B31D1D]/10 flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined text-[#B31D1D] text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  psychology
                </span>
              </div>
              <h2
                className="text-[#B31D1D] text-2xl font-bold mb-3 italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Xin chào! Tôi là Trợ lý AI Tộc Phạm Phú
              </h2>
              <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                Tôi có thể giúp bạn tìm kiếm thông tin về thành viên, lịch sử
                và sự kiện trong dòng họ. Hãy đặt câu hỏi bất kỳ nhé
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={i} content={msg.content} />
            ) : (
              <AiMessage
                key={i}
                content={msg.content}
                subjectId={msg.subject_id}
              />
            )
          )}

          {isThinking && <ThinkingState steps={agentSteps} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Footer ── */}
      <ChatInput onSend={handleSend} onFaq={handleFaq} disabled={isThinking} />
    </div>
  );
}

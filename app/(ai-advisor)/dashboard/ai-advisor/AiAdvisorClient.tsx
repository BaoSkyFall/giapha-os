"use client";

import Link from "next/link";
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

const NAV_ICONS = [
  { icon: "dashboard", href: "/dashboard", label: "Dashboard" },
  { icon: "group", href: "/dashboard/members", label: "Thành viên" },
  { icon: "leaderboard", href: "/dashboard/stats", label: "Thống kê" },
  { icon: "event", href: "/dashboard/events", label: "Sự kiện" },
  { icon: "family_history", href: "/dashboard/kinship", label: "Quan hệ" },
  { icon: "account_tree", href: "/dashboard/lineage", label: "Phả hệ" },
  { icon: "database", href: "/dashboard/data", label: "Dữ liệu" },
  { icon: "manage_accounts", href: "/dashboard/users", label: "Người dùng" },
];

const SUGGESTION_CHIPS = [
  "Tổ tiên đời đầu tiên là ai?",
  "Ông Phạm Phú Thứ có mấy người con?",
  "Lịch giỗ họ tháng này",
];

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
  disabled,
}: {
  onSend: (msg: string) => void;
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
    <footer className="p-6 bg-[#FFFCF5] border-t border-[#E8B931]/20 flex-shrink-0">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSend(chip)}
              disabled={disabled}
              className="px-4 py-1.5 rounded-full bg-white border border-[#E8B931]/30 text-xs font-medium text-slate-600 hover:border-[#B31D1D] hover:text-[#B31D1D] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="relative flex items-center group">
          <div className="absolute left-4 flex items-center text-[#B31D1D]/40 group-focus-within:text-[#B31D1D] transition-colors pointer-events-none">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <input
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
            className="absolute right-3 p-2 bg-[#B31D1D] text-white rounded-xl shadow-md hover:bg-[#93000C] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Gửi"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 font-medium tracking-wider">
          THÔNG TIN AI CUNG CẤP CÓ THỂ CẦN ĐƯỢC XÁC MINH VỚI TRƯỞNG TỘC
        </p>
      </div>
    </footer>
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

  // Auto-scroll to bottom
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

  // ── NDJSON Streaming ────────────────────────────────────────
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

        // Refresh session list to show new/updated session
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
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F3EA]">
      {/* ── Column 1: Icon Sidebar ──────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full z-50 w-20 flex flex-col items-center py-6 border-r border-[#E8B931]/30 bg-[#B31D1D] shadow-lg flex-shrink-0">
        <div
          className="text-xl font-bold text-[#E8B931] mb-8"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          GP
        </div>
        <nav className="flex flex-col gap-4 items-center w-full flex-1 overflow-y-auto">
          {NAV_ICONS.map(({ icon, href, label }) => (
            <Link
              key={icon}
              href={href}
              className="text-[#F7F3EA]/70 p-3 hover:text-white hover:bg-white/5 transition-colors group relative"
              title={label}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#201212] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {label}
              </span>
            </Link>
          ))}
          {/* AI Advisor — active */}
          <button
            className="bg-white/10 text-[#E8B931] rounded-lg p-3 transition-all group relative"
            aria-label="AI Advisor"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#201212] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              AI Advisor
            </span>
          </button>
        </nav>
      </aside>

      {/* ── Column 2: Session Drawer ───────────────────────────── */}
      <aside className="fixed left-20 top-0 h-screen z-40 w-72 border-r border-[#F1EDE2] bg-white flex flex-col shadow-none pt-4 px-4 flex-shrink-0">
        <div className="flex flex-col mb-6">
          <h2
            className="text-[#B31D1D] text-[1.125rem] font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Lịch sử hỏi đáp
          </h2>
          <p className="text-slate-500 text-[0.75rem] font-medium uppercase tracking-widest">
            Session History
          </p>
        </div>

        <button
          onClick={handleNewSession}
          className="w-full bg-[#B31D1D] text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 mb-6 hover:bg-[#93000C] transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="font-medium text-sm">Bắt đầu phiên mới</span>
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.length === 0 && (
            <p className="text-slate-400 text-xs text-center py-8">
              Chưa có phiên hỏi đáp
            </p>
          )}
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group p-3 flex items-center gap-3 rounded-r-md cursor-pointer transition-all duration-150 ${isActive
                  ? "bg-[#F7F3EA] text-[#B31D1D] font-semibold border-l-4 border-[#B31D1D] translate-x-1"
                  : "text-slate-600 hover:bg-[#F7F3EA]/50 border-l-4 border-transparent"
                  }`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">
                  history
                </span>
                <span className="text-sm truncate flex-1">
                  {session.title ?? "Phiên mới"}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                  title="Xoá phiên"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="bg-[#F1EDE2] h-[1px] my-4" />
        <div className="p-2 pb-4">
          <p className="text-[0.65rem] text-slate-400 uppercase tracking-tighter">
            Powered by Heritage Crimson Intelligence
          </p>
        </div>
      </aside>

      {/* ── Column 3: Main Content ─────────────────────────────── */}
      <main className="ml-[368px] flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top App Bar */}
        <header className="flex justify-between items-center px-8 w-full h-16 border-b-2 border-[#E8B931]/20 bg-[#F7F3EA] shadow-sm sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span
              className="material-symbols-outlined text-[#B31D1D]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <div>
              <h1
                className="text-[#B31D1D] italic text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Trợ lý AI Gia Phả
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[0.65rem] font-bold text-emerald-600 uppercase tracking-widest">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center bg-[#F1EDE2] rounded-full px-4 py-1.5 border border-[#E8B931]/20">
              <span className="material-symbols-outlined text-sm text-slate-500 mr-2">
                search
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-48 text-slate-700 outline-none"
                placeholder="Tìm kiếm trong hội thoại..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <button className="hover:text-[#B31D1D] transition-colors opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">history</span>
              </button>
              <button className="hover:text-[#B31D1D] transition-colors opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">settings</span>
              </button>
              <button className="hover:text-[#B31D1D] transition-colors opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Canvas */}
        <section className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 relative bg-[#F7F3EA]">
          {/* Lotus watermark */}
          <svg
            className="absolute bottom-[-50px] right-[-50px] opacity-5 w-[400px] pointer-events-none"
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
            <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#B31D1D]/10 flex items-center justify-center mb-4">
                <span
                  className="material-symbols-outlined text-[#B31D1D] text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  psychology
                </span>
              </div>
              <h2
                className="text-[#B31D1D] text-2xl font-bold mb-2 italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Xin chào! Tôi là Trợ lý AI Gia Phả
              </h2>
              <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                Tôi có thể giúp bạn tìm kiếm thông tin về thành viên, lịch sử và sự kiện trong dòng họ. Hãy đặt câu hỏi bất kỳ nhé
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

          {/* Thinking state */}
          {isThinking && <ThinkingState steps={agentSteps} />}

          <div ref={messagesEndRef} />
        </section>

        {/* Input Footer */}
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </main>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  PanelLeft,
  Home,
  AlertTriangle,
  ArrowDown,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import type {
  ChatMessage,
  StreamChunk,
  StructuredAnswerPayload,
} from "@/types/ai-advisor";
import Sidebar, { type SessionMeta, type SessionSource } from "./components/Sidebar";
import WelcomeState from "./components/WelcomeState";
import MessageBubble from "./components/MessageBubble";
import Composer from "./components/Composer";

interface SupabaseSessionMeta {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  isAuthenticated: boolean;
  supabaseSessions: SupabaseSessionMeta[];
}

const LS_SESSION_INDEX = "ai_sessions";

function loadLocalSessionIndex(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(LS_SESSION_INDEX);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Omit<SessionMeta, "source"> & { source?: SessionSource }
    >;
    return parsed.map((s) => ({ ...s, source: s.source ?? "local" }));
  } catch {
    return [];
  }
}

function saveLocalSessionIndex(sessions: SessionMeta[]): void {
  try {
    const localOnly = sessions.filter((s) => s.source === "local");
    localStorage.setItem(LS_SESSION_INDEX, JSON.stringify(localOnly));
  } catch {
    // ignore
  }
}

function loadLocalMessages(sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`ai_session_${sessionId}`);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(sessionId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`ai_session_${sessionId}`, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

function deleteLocalSession(sessionId: string): void {
  try {
    localStorage.removeItem(`ai_session_${sessionId}`);
  } catch {
    // ignore
  }
}

export default function TraCuuAiClient({
  isAuthenticated,
  supabaseSessions,
}: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    undefined
  );
  const [activeSessionSource, setActiveSessionSource] =
    useState<SessionSource>("local");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("Đang tra cứu gia phả...");
  const [hasError, setHasError] = useState(false);
  const [lastQuery, setLastQuery] = useState<{
    message: string;
    selectedPersonId?: string;
  } | null>(null);

  // Sidebar states
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Gate A Scroll states
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const shouldForceScrollRef = useRef(false);

  // Mobile keyboard visualViewport height sync
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // AbortController ref for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Correction report modal state
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(
    null
  );
  const [reportNote, setReportNote] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Sync visualViewport height on mobile keyboard open/close
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleResize = () => {
      setViewportHeight(vv.height);
    };
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    const localSessions = loadLocalSessionIndex();
    const supabaseMetas: SessionMeta[] = supabaseSessions.map((s) => ({
      id: s.id,
      title: s.title ?? "Phiên tra cứu",
      updatedAt: s.updated_at,
      source: "supabase" as const,
    }));
    const localIds = new Set(localSessions.map((s) => s.id));
    const supabaseIds = new Set(supabaseMetas.map((s) => s.id));
    const uniqueLocal = localSessions.filter((s) => !supabaseIds.has(s.id));
    const uniqueSupabase = supabaseMetas.filter((s) => !localIds.has(s.id));
    setSessions([...uniqueSupabase, ...uniqueLocal]);
  }, [supabaseSessions]);

  // Smart stick-to-bottom: only scrollTo when user just sent or already near bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleContainerScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distance <= 100);
  }, []);

  useEffect(() => {
    if (shouldForceScrollRef.current || isNearBottom) {
      scrollToBottom("smooth");
      shouldForceScrollRef.current = false;
    }
  }, [messages, streamingContent, isThinking, isNearBottom, scrollToBottom]);

  // Session management
  const handleNewSession = useCallback(() => {
    abortControllerRef.current?.abort();
    setActiveSessionId(undefined);
    setActiveSessionSource(isAuthenticated ? "supabase" : "local");
    setMessages([]);
    setHasError(false);
    setIsNearBottom(true);
  }, [isAuthenticated]);

  const handleSelectSession = useCallback(async (session: SessionMeta) => {
    abortControllerRef.current?.abort();
    setActiveSessionId(session.id);
    setActiveSessionSource(session.source);
    setHasError(false);
    shouldForceScrollRef.current = true;

    if (session.source === "local") {
      setMessages(loadLocalMessages(session.id));
    } else {
      try {
        const res = await fetch(`/api/chat/sessions/${session.id}`);
        if (res.ok) {
          const { session: data } = (await res.json()) as {
            session: { messages: ChatMessage[] };
          };
          setMessages(data.messages ?? []);
        }
      } catch (err) {
        console.error({ err }, "Failed to load Supabase session");
      }
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (session: SessionMeta, e: React.MouseEvent) => {
      e.stopPropagation();

      if (session.source === "local") {
        deleteLocalSession(session.id);
      } else {
        try {
          await fetch(`/api/chat/sessions/${session.id}`, {
            method: "DELETE",
          });
        } catch (err) {
          console.error({ err }, "Failed to delete Supabase session");
        }
      }

      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== session.id);
        saveLocalSessionIndex(updated);
        return updated;
      });

      if (activeSessionId === session.id) {
        setActiveSessionId(undefined);
        setMessages([]);
      }
    },
    [activeSessionId]
  );

  // Execute chat request
  const executeSend = useCallback(
    async (userMessage: string, selectedPersonId?: string) => {
      if ((!userMessage.trim() && !selectedPersonId) || isThinking) return;

      const sessionSource: SessionSource = activeSessionId
        ? activeSessionSource
        : isAuthenticated
        ? "supabase"
        : "local";

      const historySnapshot = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const displayPrompt =
        userMessage.trim() || `Chọn thành viên tra cứu [${selectedPersonId}]`;
      const newUserMsg: ChatMessage = {
        role: "user",
        content: displayPrompt,
        timestamp: new Date().toISOString(),
      };

      const updatedWithUser = [...messages, newUserMsg];
      shouldForceScrollRef.current = true;
      setMessages(updatedWithUser);
      setIsThinking(true);
      setThinkingLabel("Đang tra cứu cây gia phả...");
      setHasError(false);
      setLastQuery({ message: userMessage, selectedPersonId });

      const currentSessionId = activeSessionId ?? crypto.randomUUID();
      if (!activeSessionId) {
        setActiveSessionId(currentSessionId);
        setActiveSessionSource(sessionSource);
      }

      let accumulatedText = "";
      let structuredResult: StructuredAnswerPayload | undefined;
      let rafId: number | null = null;
      let dirtyStream = false;

      const flushStreamingPreview = () => {
        if (!dirtyStream) return;
        dirtyStream = false;
        setStreamingContent(accumulatedText);
      };

      const scheduleStreamingPreview = () => {
        dirtyStream = true;
        if (rafId !== null) return;
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
          rafId = window.requestAnimationFrame(() => {
            rafId = null;
            flushStreamingPreview();
          });
        } else {
          flushStreamingPreview();
        }
      };

      const fetchController = new AbortController();
      abortControllerRef.current = fetchController;
      const fetchTimeoutId = setTimeout(() => fetchController.abort(), 20_000);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: fetchController.signal,
          body: JSON.stringify({
            message: userMessage,
            selected_person_id: selectedPersonId,
            session_id: currentSessionId,
            messages: historySnapshot,
            session_source: sessionSource,
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
              setThinkingLabel(chunk.label);
            } else if (chunk.type === "text") {
              if (!structuredResult) {
                accumulatedText += chunk.delta;
                scheduleStreamingPreview();
              }
            } else if (chunk.type === "structured") {
              structuredResult = chunk.payload;
              if (chunk.payload?.message) {
                accumulatedText = chunk.payload.message;
                scheduleStreamingPreview();
              }
            } else if (chunk.type === "error") {
              accumulatedText = chunk.message;
              setHasError(true);
            }
          }
        }

        // Flush any remaining buffered line
        if (buffer.trim()) {
          try {
            const tailChunk = JSON.parse(buffer.trim()) as StreamChunk;
            if (tailChunk.type === "text" && !structuredResult) {
              accumulatedText += tailChunk.delta;
            } else if (tailChunk.type === "structured" && tailChunk.payload?.message) {
              structuredResult = tailChunk.payload;
              accumulatedText = tailChunk.payload.message;
            }
          } catch {
            // ignore incomplete trailing JSON
          }
        }

        if (rafId !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        setStreamingContent("");

        if (accumulatedText) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: accumulatedText,
            timestamp: new Date().toISOString(),
            response_type: structuredResult?.type,
            candidates: structuredResult?.candidates,
            suggestions: structuredResult?.suggestions,
            reasoning_steps: structuredResult?.reasoning_steps,
            data: structuredResult?.data,
            verification_status: structuredResult?.verification_status,
            data_completeness: structuredResult?.data_completeness,
            missing_fields: structuredResult?.missing_fields,
            provenance: structuredResult?.provenance,
            reason_code: structuredResult?.reason_code,
            is_demo_data: structuredResult?.is_demo_data,
            sources: structuredResult?.sources,
            meta: structuredResult?.meta,
          };

          const finalMessages = [...updatedWithUser, assistantMsg];
          setMessages(finalMessages);

          if (sessionSource === "local") {
            saveLocalMessages(currentSessionId, finalMessages);
          }

          setSessions((prev) => {
            const title =
              prev.find((s) => s.id === currentSessionId)?.title ??
              (userMessage.trim() || "Tra cứu gia phả").slice(0, 60);
            const meta: SessionMeta = {
              id: currentSessionId,
              title,
              updatedAt: new Date().toISOString(),
              source: sessionSource,
            };
            const filtered = prev.filter((s) => s.id !== currentSessionId);
            const next = [meta, ...filtered];
            if (sessionSource === "local") {
              saveLocalSessionIndex(next);
            }
            return next;
          });
        }
      } catch (error) {
        if (rafId !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        setStreamingContent("");
        const isAbort =
          error instanceof DOMException && error.name === "AbortError";
        if (isAbort) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: accumulatedText || "Đã dừng tạo câu trả lời.",
              timestamp: new Date().toISOString(),
              verification_status: accumulatedText ? "partial" : "not_found",
            },
          ]);
        } else {
          setHasError(true);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Không thể kết nối đến hệ thống tra cứu gia phả. Vui lòng kiểm tra kết nối và thử lại.",
              timestamp: new Date().toISOString(),
              response_type: "error",
            },
          ]);
        }
      } finally {
        clearTimeout(fetchTimeoutId);
        abortControllerRef.current = null;
        setStreamingContent("");
        setIsThinking(false);
      }
    },
    [isThinking, activeSessionId, activeSessionSource, isAuthenticated, messages]
  );

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(() => {
    if (!lastQuery || isThinking) return;
    executeSend(lastQuery.message, lastQuery.selectedPersonId);
  }, [lastQuery, isThinking, executeSend]);

  const handleSelectCandidate = useCallback(
    (personId: string, name: string) => {
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user")
        ?.content?.trim();
      const preservedQuestion = lastUserMsg || `Tra cứu thông tin ${name}`;
      executeSend(preservedQuestion, personId);
    },
    [executeSend, messages]
  );

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportNote.trim()) return;
    try {
      const existing = JSON.parse(
        localStorage.getItem("ai_correction_reports") ?? "[]"
      ) as Array<Record<string, unknown>>;
      existing.push({
        note: reportNote.trim(),
        messageExcerpt: reportingMessage?.content.slice(0, 200),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("ai_correction_reports", JSON.stringify(existing));
    } catch {
      // ignore storage errors
    }
    setReportSubmitted(true);
    setTimeout(() => {
      setReportingMessage(null);
      setReportNote("");
      setReportSubmitted(false);
    }, 1400);
  };

  const hasDemoBanner = messages.some((m) => m.is_demo_data === true);

  return (
    <div
      className="flex w-full overflow-hidden bg-[#FAF8F3] text-[#292725]"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isDesktopOpen={isDesktopSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Minimal Workspace Header */}
        <header className="h-14 shrink-0 border-b border-[#E8E2D8] bg-[#FAF8F3] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileSidebarOpen(true);
                } else {
                  setIsDesktopSidebarOpen((prev) => !prev);
                }
              }}
              className="p-2 -ml-1 rounded-lg text-[#5C5750] hover:text-[#292725] hover:bg-[#F3EFE6] transition-colors shrink-0"
              aria-label="Đóng/mở thanh bên"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <h1 className="font-serif font-bold text-base sm:text-lg text-[#292725] truncate">
              AI Tra cứu Gia phả
            </h1>

            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FBF6EA] text-[#8F6A16] border border-[#C99B35]/30 shrink-0">
              13 thế hệ · Tộc Phạm Phú
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-[#5C5750] bg-[#FFFFFF] border border-[#E8E2D8] hover:border-[#A91E22] hover:text-[#A91E22] transition-colors shrink-0"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
        </header>

        {/* Demo Data Warning Banner */}
        {hasDemoBanner && (
          <div className="shrink-0 bg-[#FBF6EA] border-b border-[#C99B35]/35 px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs text-[#8F6A16]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#C99B35]" />
            <span>
              Đang chạy dữ liệu mẫu (offline) — không phải dữ liệu gia phả chính thức
            </span>
          </div>
        )}

        {/* Messages Scroll Container (Gate A) */}
        <div
          ref={messagesContainerRef}
          onScroll={handleContainerScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain relative"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="max-w-[900px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            {messages.length === 0 ? (
              <WelcomeState onSelectQuery={(q) => executeSend(q)} />
            ) : (
              messages.map((msg, idx) => {
                const isLastAssistant =
                  msg.role === "assistant" && idx === messages.length - 1;
                return (
                  <MessageBubble
                    key={`${msg.timestamp}-${idx}`}
                    message={msg}
                    onSelectCandidate={handleSelectCandidate}
                    onSelectSuggestion={(q) => executeSend(q)}
                    onReportCorrection={(m) => setReportingMessage(m)}
                    onRegenerate={
                      isLastAssistant && lastQuery ? handleRegenerate : undefined
                    }
                  />
                );
              })
            )}

            {isThinking && streamingContent && (
              <MessageBubble
                message={{
                  role: "assistant",
                  content: streamingContent,
                  timestamp: "streaming",
                }}
                isStreaming
                onSelectCandidate={handleSelectCandidate}
                onSelectSuggestion={(q) => executeSend(q)}
                onReportCorrection={(m) => setReportingMessage(m)}
              />
            )}

            {isThinking && !streamingContent && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#FFFFFF] border border-[#E8E2D8] text-xs sm:text-sm text-[#5C5750] w-fit">
                <Loader2 className="w-4 h-4 text-[#A91E22] animate-spin shrink-0" />
                <span>{thinkingLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Scroll-to-Bottom Button */}
        {!isNearBottom && messages.length > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => {
                shouldForceScrollRef.current = true;
                scrollToBottom("smooth");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#292725] text-white text-xs font-medium shadow-md hover:bg-[#5C5750] transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Đến tin nhắn mới</span>
            </button>
          </div>
        )}

        {/* Composer */}
        <Composer
          isThinking={isThinking}
          hasError={hasError}
          onSend={(q) => executeSend(q)}
          onCancel={handleCancel}
          onRetry={handleRegenerate}
        />
      </div>

      {/* Report Correction Modal */}
      {reportingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292725]/40">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#292725]">
                Báo sửa thông tin gia phả
              </h3>
              <button
                type="button"
                onClick={() => setReportingMessage(null)}
                className="p-1 rounded-lg text-[#8A8378] hover:text-[#292725] hover:bg-[#F3EFE6]"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#227C44] mx-auto" />
                <p className="text-sm font-medium text-[#292725]">
                  Đã ghi nhận góp ý sửa thông tin. Cảm ơn quý vị!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <p className="text-xs text-[#5C5750]">
                  Vui lòng mô tả nội dung cần đính chính (họ tên, năm sinh/mất, đời thứ hoặc quan hệ):
                </p>
                <textarea
                  rows={4}
                  required
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Ví dụ: Cụ Phạm Phú ... sinh năm ... thuộc đời thứ ..."
                  className="w-full rounded-xl bg-[#FAF8F3] border border-[#D6CEC0] p-3 text-sm text-[#292725] focus:outline-none focus:border-[#A91E22]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportingMessage(null)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#5C5750] hover:bg-[#F3EFE6]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#A91E22] hover:bg-[#8C171B] text-white"
                  >
                    Gửi góp ý
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

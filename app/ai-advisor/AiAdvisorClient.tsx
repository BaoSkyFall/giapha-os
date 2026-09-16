"use client";

import { FAQ_CHIPS, type FaqChip } from "./data";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type {
  ChatMessage,
  StreamChunk,
  CandidatePerson,
  PersonProfileData,
  PersonDetail,
  RelationshipData,
  StructuredAnswerPayload,
} from "@/types/ai-advisor";

// ─────────────────────────────────────────────────────────────
// Session types
// ─────────────────────────────────────────────────────────────

type SessionSource = "local" | "supabase";

interface SessionMeta {
  id: string;
  title: string;
  updatedAt: string;
  source: SessionSource;
}

// ─────────────────────────────────────────────────────────────
// localStorage helpers (anonymous + legacy sessions)
// ─────────────────────────────────────────────────────────────

const LS_SESSION_INDEX = "ai_sessions";

function loadLocalSessionIndex(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(LS_SESSION_INDEX);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<SessionMeta, "source"> & { source?: SessionSource }>;
    return parsed.map((s) => ({ ...s, source: s.source ?? "local" }));
  } catch {
    return [];
  }
}

function saveLocalSessionIndex(sessions: SessionMeta[]): void {
  try {
    const localOnly = sessions.filter((s) => s.source === "local");
    localStorage.setItem(LS_SESSION_INDEX, JSON.stringify(localOnly));
  } catch (err) {
    console.error({ err }, "Failed to save local session index");
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
  } catch (err) {
    console.error({ err }, "Failed to save session messages");
  }
}

function deleteLocalSession(sessionId: string): void {
  try {
    localStorage.removeItem(`ai_session_${sessionId}`);
  } catch {
    // ignore
  }
}

// ─────────────────────────────────────────────────────────────
// Sub-components & Interactive Cards
// ─────────────────────────────────────────────────────────────

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="max-w-[78%] bg-[#B31D1D] text-white shadow-md rounded-2xl rounded-tr-none px-5 py-3.5 border border-[#B31D1D]">
        <p className="text-sm md:text-base leading-relaxed text-white font-normal text-pretty">{content}</p>
      </div>
    </div>
  );
}

function DisambiguationCard({
  candidates,
  onSelect,
}: {
  candidates: CandidatePerson[];
  onSelect: (personId: string, name: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2.5">
      <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
        Vui lòng chọn thành viên bạn muốn tra cứu:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {candidates.map((c) => (
          <div
            key={c.person_id}
            className="bg-stone-50 border border-stone-200 hover:border-[#B31D1D] rounded-xl p-3.5 transition-all shadow-sm hover:shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-stone-900 text-sm md:text-base">
                  {c.honorific ? `${c.honorific} ` : ""}{c.display_name}
                </span>
                {c.generation && (
                  <span className="text-[11px] font-medium bg-[#E8B931]/20 text-[#8B6A00] px-2 py-0.5 rounded-full border border-[#E8B931]/30 shrink-0">
                    Đời {c.generation}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-600 space-y-0.5 mb-3">
                {c.branch && <p>Nhánh: <span className="font-medium text-stone-800">{c.branch}</span></p>}
                {(c.birth_year || c.birth_display) && (
                  <p>Sinh: <span className="font-medium text-stone-800">{c.birth_display || c.birth_year}</span></p>
                )}
                {c.father_name && (
                  <p>Thân phụ: <span className="font-medium text-stone-800">{c.father_name}</span></p>
                )}
                {c.mother_name && (
                  <p>Thân mẫu: <span className="font-medium text-stone-800">{c.mother_name}</span></p>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(c.person_id, c.display_name)}
              className="w-full py-1.5 px-3 bg-white hover:bg-[#B31D1D] text-[#B31D1D] hover:text-white border border-[#B31D1D]/40 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Chọn thành viên này</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelationshipCard({ rel }: { rel: RelationshipData }) {
  return (
    <div className="mt-3 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2 text-[#B31D1D] font-bold text-sm">
        <span className="material-symbols-outlined text-lg">schema</span>
        <span>Mắt xích quan hệ huyết thống</span>
      </div>
      {rel.path_labels && rel.path_labels.length > 0 && (
        <div className="space-y-1.5 my-2.5 pl-2 border-l-2 border-[#E8B931]">
          {rel.path_labels.map((step, idx) => (
            <div key={idx} className="text-xs text-stone-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B31D1D] shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 bg-white border border-amber-200 rounded-md font-medium text-stone-800">
          Cách xưng hô: <strong>{rel.a_calls_b}</strong> / <strong>{rel.b_calls_a}</strong>
        </span>
      </div>
    </div>
  );
}

function PersonProfileCard({ person }: { person?: PersonDetail | null }) {
  if (!person) return null;
  const p = person as Record<string, unknown>;
  const personId = (p.id || p.person_id) as string | undefined;
  if (!personId) return null;
  const fullName = (p.full_name || p.display_name || "") as string;
  const honorific = (p.honorific || "") as string;
  const generation = p.generation as number | null | undefined;
  const branch = p.branch as string | null | undefined;
  const birthDisplay = (p.birth_display || (p.birth_year ? String(p.birth_year) : null)) as string | null;
  const deathDisplay = (p.death_display || (p.death_year ? String(p.death_year) : null)) as string | null;

  return (
    <div className="mt-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 text-sm md:text-base">
            {honorific ? `${honorific} ` : ""}{fullName}
          </span>
          {generation && (
            <span className="text-[11px] font-medium bg-[#E8B931]/20 text-[#8B6A00] px-2 py-0.5 rounded-full border border-[#E8B931]/30">
              Đời {generation}
            </span>
          )}
        </div>
        <div className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-3">
          {branch && <span>Nhánh: <strong>{branch}</strong></span>}
          {birthDisplay && <span>Sinh: <strong>{birthDisplay}</strong></span>}
          {deathDisplay && <span>Mất: <strong>{deathDisplay}</strong></span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/dashboard/members?id=${personId}`}
          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-[14px]">account_tree</span>
          <span>Xem gia phả</span>
        </Link>
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  onSelectCandidate,
  onSuggestionClick,
}: {
  msg: ChatMessage;
  onSelectCandidate: (personId: string, name: string) => void;
  onSuggestionClick: (query: string) => void;
}) {
  const lines = (msg.content || "").split("\n").filter((l) => l.trim() !== "");
  const primaryPerson = msg.data?.primary_person;
  const relationship = msg.data?.relationship;

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="max-w-[85%] md:max-w-[80%] flex gap-3.5">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full bg-[#B31D1D] flex items-center justify-center shadow border border-[#E8B931]/40">
            <span className="material-symbols-outlined text-white text-lg">temple_buddhist</span>
          </div>
        </div>
        <div className="flex-1 bg-white shadow-sm rounded-2xl rounded-tl-none overflow-hidden border border-stone-200/90">
          <div className="h-1 bg-gradient-to-r from-[#E8B931] via-[#B31D1D] to-[#E8B931] opacity-70" />
          <div className="p-4 md:p-5">
            <div className="text-stone-800 text-sm md:text-base leading-relaxed space-y-2 text-pretty">
              {lines.map((line, i) =>
                line.startsWith("- ") || line.startsWith("• ") ? (
                  <li key={i} className="flex items-start gap-2.5 list-none">
                    <span className="w-4 h-4 rounded-full bg-[#E8B931]/20 flex items-center justify-center mt-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B6A00]" />
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong class='text-stone-900 font-semibold'>$1</strong>"),
                      }}
                    />
                  </li>
                ) : (
                  <p
                    key={i}
                    dangerouslySetInnerHTML={{
                      __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-stone-900 font-semibold'>$1</strong>"),
                    }}
                  />
                )
              )}
            </div>

            {/* Disambiguation Cards */}
            {msg.candidates && msg.candidates.length > 0 ? (
              <DisambiguationCard candidates={msg.candidates} onSelect={onSelectCandidate} />
            ) : null}

            {/* Structured Person Profile Card */}
            {msg.response_type === "person" && primaryPerson ? (
              <PersonProfileCard person={primaryPerson} />
            ) : null}

            {/* Structured Relationship Path Card */}
            {msg.response_type === "relationship" && relationship ? (
              <RelationshipCard rel={relationship} />
            ) : null}

            {/* Follow-up Suggestions */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-2">
                {msg.suggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => onSuggestionClick(sug)}
                    className="px-3 py-1 bg-stone-50 hover:bg-[#B31D1D]/10 text-stone-600 hover:text-[#B31D1D] border border-stone-200 hover:border-[#B31D1D]/30 rounded-full text-xs font-medium transition-all text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingState() {
  return (
    <div className="flex justify-start animate-in fade-in duration-300">
      <div className="max-w-[80%] flex gap-3.5">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full bg-[#B31D1D]/10 flex items-center justify-center border border-[#B31D1D]/20">
            <span className="material-symbols-outlined text-[#B31D1D] text-lg animate-pulse">
              hourglass_top
            </span>
          </div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-[#B31D1D] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-stone-600">Đang tra cứu cơ sở dữ liệu gia phả...</span>
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
    <div className="sticky bottom-0 bg-[#FBF9F5] border-t border-stone-200/80 p-4 md:p-5 flex-shrink-0 z-10 shadow-sm">
      <div className="max-w-[960px] mx-auto flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {FAQ_CHIPS.slice(0, 4).map((chip) => (
            <button
              key={chip.question}
              onClick={() => onFaq(chip)}
              disabled={disabled}
              className="px-3.5 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:border-[#B31D1D] hover:text-[#B31D1D] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center group">
          <input
            id="genealogy-search-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            placeholder="Hỏi về thành viên, quan hệ họ hàng, hoặc cội nguồn chi phái..."
            className="w-full pl-4 pr-14 py-3.5 bg-white rounded-xl border border-stone-300 focus:border-[#B31D1D] focus:ring-1 focus:ring-[#B31D1D] focus:outline-none shadow-sm transition-all text-stone-900 text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-stone-400"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="Gửi tra cứu"
            className="absolute right-2 p-2 bg-[#B31D1D] text-white rounded-lg shadow hover:bg-[#93000C] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">search</span>
          </button>
        </div>
        <p className="text-center text-[11px] text-stone-500 font-medium tracking-wide">
          Hệ thống tra cứu dữ liệu xác định — Thông tin chính xác theo hồ sơ phả hệ Tộc Phạm Phú
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function AiAdvisorClient({ isAuthenticated, supabaseSessions }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [activeSessionSource, setActiveSessionSource] = useState<SessionSource>("local");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // ── Session management ──────────────────────────────────────

  const handleNewSession = useCallback(() => {
    setActiveSessionId(undefined);
    setActiveSessionSource(isAuthenticated ? "supabase" : "local");
    setMessages([]);
  }, [isAuthenticated]);

  const handleSelectSession = useCallback(async (session: SessionMeta) => {
    setActiveSessionId(session.id);
    setActiveSessionSource(session.source);

    if (session.source === "local") {
      setMessages(loadLocalMessages(session.id));
    } else {
      try {
        const res = await fetch(`/api/chat/sessions/${session.id}`);
        if (res.ok) {
          const { session: data } = (await res.json()) as { session: { messages: ChatMessage[] } };
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
          await fetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
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

  const handleFaq = useCallback((chip: FaqChip) => {
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: chip.question, timestamp: now },
      { role: "assistant", content: chip.answer, timestamp: now, response_type: "answer" },
    ]);
  }, []);

  // ── Send message / Query ─────────────────────────────────────

  const executeSend = useCallback(
    async (userMessage: string, selectedPersonId?: string) => {
      if ((!userMessage.trim() && !selectedPersonId) || isThinking) return;

      const sessionSource: SessionSource = activeSessionId
        ? activeSessionSource
        : isAuthenticated
        ? "supabase"
        : "local";

      const historySnapshot = messages.map((m) => ({ role: m.role, content: m.content }));

      const displayPrompt = userMessage.trim() || `Chọn thành viên tra cứu [${selectedPersonId}]`;
      const newUserMsg: ChatMessage = {
        role: "user",
        content: displayPrompt,
        timestamp: new Date().toISOString(),
      };
      const updatedWithUser = [...messages, newUserMsg];
      setMessages(updatedWithUser);
      setIsThinking(true);

      const currentSessionId = activeSessionId ?? crypto.randomUUID();
      if (!activeSessionId) {
        setActiveSessionId(currentSessionId);
        setActiveSessionSource(sessionSource);
      }

      let accumulatedText = "";
      let structuredResult: StructuredAnswerPayload | undefined;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            selected_person_id: selectedPersonId,
            session_id: currentSessionId,
            messages: historySnapshot,
            session_source: sessionSource,
          }),
        });

        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

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

            if (chunk.type === "text") {
              accumulatedText += chunk.delta;
            } else if (chunk.type === "structured") {
              structuredResult = chunk.payload;
              if (chunk.payload?.message) {
                accumulatedText = chunk.payload.message;
              }
            } else if (chunk.type === "error") {
              accumulatedText = `⚠️ ${chunk.message}`;
            }
          }
        }

        if (accumulatedText) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: accumulatedText,
            timestamp: new Date().toISOString(),
            response_type: structuredResult?.type,
            candidates: structuredResult?.candidates,
            suggestions: structuredResult?.suggestions,
            data: structuredResult?.data,
            meta: structuredResult?.meta,
          };
          const finalMessages = [...updatedWithUser, assistantMsg];
          setMessages(finalMessages);

          if (sessionSource === "local") {
            saveLocalMessages(currentSessionId, finalMessages);
            setSessions((prev) => {
              const title =
                prev.find((s) => s.id === currentSessionId)?.title ?? userMessage.slice(0, 60);
              const meta: SessionMeta = {
                id: currentSessionId,
                title,
                updatedAt: new Date().toISOString(),
                source: "local",
              };
              const filtered = prev.filter((s) => s.id !== currentSessionId);
              const next = [meta, ...filtered];
              saveLocalSessionIndex(next);
              return next;
            });
          }
        }
      } catch (error) {
        console.error({ error }, "executeSend failed");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "⚠️ Có lỗi kết nối đến hệ thống tra cứu gia phả. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau giây lát.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, activeSessionId, activeSessionSource, isAuthenticated, messages]
  );

  const handleSend = useCallback(
    (userMessage: string) => {
      executeSend(userMessage);
    },
    [executeSend]
  );

  const handleSelectCandidate = useCallback(
    (personId: string, name: string) => {
      executeSend(`Tra cứu thông tin ${name}`, personId);
    },
    [executeSend]
  );

  const handleSuggestionClick = useCallback(
    (query: string) => {
      executeSend(query);
    },
    [executeSend]
  );

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#FBF9F5]" style={{ scrollbarGutter: "stable" }}>
      {/* ── Sub-header bar ── */}
      <div className="flex-shrink-0 border-b border-stone-200/90 bg-white shadow-xs">
        <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1
              className="text-[#B31D1D] text-base md:text-lg font-bold leading-tight flex items-center gap-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tra cứu Gia phả Tộc Phạm Phú
            </h1>
            <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Hệ thống đang hoạt động
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B31D1D] text-white text-xs md:text-sm font-semibold hover:bg-[#93000C] transition-all shadow-sm"
              aria-label="Phiên mới"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span className="hidden sm:inline">Phiên mới</span>
            </button>
            {sessions.length > 0 && (
              <div className="relative group">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs md:text-sm text-stone-700 hover:border-[#B31D1D] hover:text-[#B31D1D] transition-all shadow-xs"
                  aria-label="Lịch sử tra cứu"
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span className="hidden sm:inline">
                    {activeSessionId
                      ? sessions.find((s) => s.id === activeSessionId)?.title ?? "Phiên hiện tại"
                      : "Lịch sử"}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-50 hidden group-hover:block">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-colors ${
                        session.id === activeSessionId
                          ? "bg-amber-50 text-[#B31D1D] font-semibold"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px] text-stone-400 shrink-0">
                        {session.source === "supabase" ? "cloud" : "storage"}
                      </span>
                      <span className="text-xs truncate flex-1">{session.title}</span>
                      <button
                        onClick={(e) => handleDeleteSession(session, e)}
                        className="text-stone-300 hover:text-red-500 transition-colors shrink-0"
                        title="Xoá phiên"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Official Genealogy Notice (Replaces AI Disclaimer) ── */}
      <div className="flex-shrink-0 bg-stone-100/70 border-b border-stone-200/80 px-4 py-2">
        <p className="max-w-[960px] mx-auto text-stone-600 text-xs text-center leading-relaxed text-pretty">
          🎋 <strong>Thông tin tra cứu chính thức:</strong> Toàn bộ dữ liệu được đối chiếu từ văn bản phả đồ Tộc Phạm Phú.
          Nếu phát hiện thông tin chưa cập nhật, xin vui lòng thông báo cho Ban quản trị dòng tộc.
        </p>
      </div>

      {/* ── Chat Canvas ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
        <div className="max-w-[960px] mx-auto flex flex-col gap-5 min-h-full">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#B31D1D]/10 flex items-center justify-center mb-4 border border-[#B31D1D]/20">
                <span className="material-symbols-outlined text-[#B31D1D] text-3xl">menu_book</span>
              </div>
              <h2
                className="text-[#B31D1D] text-2xl font-bold mb-2 italic"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Tra cứu Gia phả Tộc Phạm Phú
              </h2>
              <p className="text-stone-500 text-sm max-w-md leading-relaxed text-pretty mb-8">
                Tìm kiếm thông tin tiền nhân, tra cứu mối quan hệ họ hàng, thế hệ chi phái và cội nguồn dòng tộc một cách chính xác tuyệt đối.
              </p>

              {/* Suggestion Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                <button
                  onClick={() => handleSend("Thủy tổ tộc Phạm Phú là ai?")}
                  className="p-3.5 bg-white border border-stone-200 hover:border-[#B31D1D] rounded-xl text-xs transition-all shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center gap-2 font-bold text-stone-800 group-hover:text-[#B31D1D] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-[#B31D1D]">crown</span>
                    <span>Thủy tổ dòng họ là ai?</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">Xem nguồn cội và người khai sáng Tộc Phạm Phú tại Gò Nổi.</p>
                </button>

                <button
                  onClick={() => handleSend("Phạm Phú Thứ là ai?")}
                  className="p-3.5 bg-white border border-stone-200 hover:border-[#B31D1D] rounded-xl text-xs transition-all shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center gap-2 font-bold text-stone-800 group-hover:text-[#B31D1D] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-[#B31D1D]">person</span>
                    <span>Danh thần Phạm Phú Thứ</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">Tiểu sử, trước tác và công trạng của đại thần triều Nguyễn.</p>
                </button>

                <button
                  onClick={() => handleSend("Phạm Phú Thứ và Phạm Phú Quốc có quan hệ gì?")}
                  className="p-3.5 bg-white border border-stone-200 hover:border-[#B31D1D] rounded-xl text-xs transition-all shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center gap-2 font-bold text-stone-800 group-hover:text-[#B31D1D] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-[#B31D1D]">hub</span>
                    <span>Tra quan hệ hai thành viên</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">Xác định vai vế, cách xưng hô và tổ tiên chung gần nhất.</p>
                </button>

                <button
                  onClick={() => handleSend("Thủy tổ Phái Nhất là ai?")}
                  className="p-3.5 bg-white border border-stone-200 hover:border-[#B31D1D] rounded-xl text-xs transition-all shadow-xs hover:shadow-sm group"
                >
                  <div className="flex items-center gap-2 font-bold text-stone-800 group-hover:text-[#B31D1D] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-[#B31D1D]">account_tree</span>
                    <span>Tra cứu theo Chi phái</span>
                  </div>
                  <p className="text-stone-500 text-[11px]">Khám phá các nhánh Phái Nhất, Phái Nhì và các chi phái kế tiếp.</p>
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={i} content={msg.content} />
            ) : (
              <AssistantMessage
                key={i}
                msg={msg}
                onSelectCandidate={handleSelectCandidate}
                onSuggestionClick={handleSuggestionClick}
              />
            )
          )}

          {isThinking && <ThinkingState />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Footer ── */}
      <ChatInput onSend={handleSend} onFaq={handleFaq} disabled={isThinking} />
    </div>
  );
}

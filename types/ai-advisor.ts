// ============================================================
// AI Advisor — Shared Type Definitions
// ============================================================

// Agent pipeline step identifiers (matches streaming label keys)
export type AgentStep = "parsing" | "searching" | "verifying" | "narrating";

// Streaming chunk format — NDJSON, one per line
export type StreamChunk =
  | { type: "agent_step"; step: AgentStep; label: string }
  | { type: "text"; delta: string }
  | { type: "done"; sessionId: string; subject?: PersonSummary }
  | { type: "error"; message: string; code?: string };

// Minimal person shape included in 'done' stream chunk
export interface PersonSummary {
  id: string;
  full_name: string;
  generation: number | null;
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
}

// Stored message format in chat_sessions.messages jsonb column
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  subject_id?: string;
  metadata?: {
    query_type?: string;
  };
}

// chat_sessions row shape (matches Phase 1 schema)
export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  messages: ChatMessage[];
  scratchpad: ChatScratchpad;
  created_at: string;
  updated_at: string;
}

// Scratchpad stored in chat_sessions.scratchpad
export interface ChatScratchpad {
  confirmed_subject_id?: string;
  pending_clarification?: boolean;
}

// POST /api/chat request body
export interface ChatRequestBody {
  message: string;
  session_id?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>; // conversation history
  session_source?: "local" | "supabase"; // determines persistence strategy
}

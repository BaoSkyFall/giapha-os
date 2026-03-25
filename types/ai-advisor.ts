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
  | { type: "clarify"; question: string; candidates: PersonSearchResult[] }
  | { type: "error"; message: string; code?: string };

// Person data returned by search_persons_fuzzy RPC
export interface PersonSearchResult {
  id: string;
  full_name: string;
  other_names: string | null;
  generation: number | null;
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
  gender: string;
  score: number;
}

// Minimal person shape included in 'done' stream chunk
export interface PersonSummary {
  id: string;
  full_name: string;
  generation: number | null;
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
}

// Agent 1 output: parsed intent from user message
export interface AgentIntent {
  subject: string; // extracted person name/reference
  query_type: "profile" | "relationship" | "fact" | "count" | "unknown" | "off_topic";
  language: "vi" | "en";
  raw_question: string; // original user message
}

// Agent 3 output: verification category
export type VerificationResult =
  | { status: "FOUND_ONE"; subject: PersonSearchResult }
  | { status: "FOUND_MANY"; candidates: PersonSearchResult[] }
  | { status: "FOUND_NONE" };

// Shared pipeline context passed between agents
export interface PipelineContext {
  userMessage: string;
  intent: AgentIntent;
  candidates: PersonSearchResult[];
  verificationResult: VerificationResult;
  confirmedSubject?: PersonSummary;
  sessionId: string;
  userId: string;
  previousMessages: ChatMessage[];
}

// Stored message format in chat_sessions.messages jsonb column
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  subject_id?: string; // person ID if resolved in this turn
  metadata?: {
    agent_steps?: AgentStep[];
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
  candidates?: PersonSearchResult[];      // saved candidates for follow-up re-search
  pending_clarification?: boolean;        // true = last turn ended with clarify chunk
  clarification_round?: number;           // 0-indexed, max MAX_CLARIFICATION_ROUNDS (2)
}

// POST /api/chat request body
export interface ChatRequestBody {
  message: string;
  session_id?: string; // omit to start new session
}

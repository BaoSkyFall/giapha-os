// ============================================================
// AI Advisor / Tra cứu Gia phả — Shared Type Definitions
// ============================================================

// Agent pipeline step identifiers
export type AgentStep = "parsing" | "searching" | "verifying" | "narrating";

export interface CandidatePerson {
  person_id: string;
  display_name: string;
  honorific?: string;
  generation?: number | null;
  branch?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  birth_display?: string | null;
  death_display?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  avatar_url?: string | null;
  is_deceased?: boolean;
}

export interface PersonProfileData {
  id: string;
  full_name: string;
  honorific?: string | null;
  gender?: string | null;
  generation?: number | null;
  branch?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  birth_display?: string | null;
  death_display?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  is_deceased?: boolean;
  avatar_url?: string | null;
}

export interface RelationshipData {
  relationship_type: string;
  a_calls_b: string;
  b_calls_a: string;
  description: string;
  distance_a: number;
  distance_b: number;
  path: string[];
  path_labels: string[];
  common_ancestor?: PersonProfileData | CandidatePerson | Record<string, unknown> | null;
}

export type PersonDetail = PersonProfileData | CandidatePerson | Record<string, unknown>;

export interface ChatMessageData {
  primary_person?: PersonDetail;
  secondary_person?: PersonDetail;
  related_persons?: PersonDetail[];
  relationship?: RelationshipData;
  [key: string]: unknown;
}

export interface StructuredAnswerPayload {
  type:
    | "answer"
    | "person"
    | "relationship"
    | "person_list"
    | "disambiguation"
    | "not_found"
    | "clarification"
    | "unknown"
    | "error";
  message: string;
  answer?: string;
  data?: ChatMessageData;
  candidates?: CandidatePerson[];
  suggestions?: string[];
  meta?: {
    intent?: string;
    latency_ms?: number;
    confidence?: number;
    status?: string;
  };
}

// Streaming chunk format — NDJSON, one per line
export type StreamChunk =
  | { type: "agent_step"; step: AgentStep; label: string }
  | { type: "text"; delta: string }
  | { type: "structured"; payload: StructuredAnswerPayload }
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

// Stored message format in chat_sessions.messages jsonb column and local state
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO 8601
  subject_id?: string;
  response_type?:
    | "answer"
    | "person"
    | "relationship"
    | "person_list"
    | "disambiguation"
    | "not_found"
    | "clarification"
    | "unknown"
    | "error";
  candidates?: CandidatePerson[];
  suggestions?: string[];
  data?: ChatMessageData;
  meta?: Record<string, unknown>;
}

// chat_sessions row shape
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
  selected_person_id?: string;
  session_id?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>; // conversation history
  session_source?: "local" | "supabase"; // determines persistence strategy
}

import { getSupabase, getUser } from "@/utils/supabase/queries";
import { parseIntent } from "@/utils/ai-advisor/agent1-intent-parser";
import { searchPersons } from "@/utils/ai-advisor/agent2-db-search";
import { verifyCandidates } from "@/utils/ai-advisor/agent3-verifier";
import { narrateResponse } from "@/utils/ai-advisor/agent5-narrator";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  PersonSummary,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

// Helper: encode a StreamChunk as NDJSON line
function encodeChunk(chunk: StreamChunk): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(chunk) + "\n");
}

export async function POST(request: NextRequest) {
  // ── Auth Guard ──────────────────────────────────────────────
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Parse Request ───────────────────────────────────────────
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, session_id } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Load Existing Session ───────────────────────────────────
  const supabase = await getSupabase();
  let sessionId: string | undefined = session_id;
  let previousMessages: ChatMessage[] = [];

  if (sessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("messages, scratchpad")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (session) {
      previousMessages = (session.messages as ChatMessage[]) ?? [];
    } else {
      // Session not found or belongs to another user — start fresh
      sessionId = undefined;
    }
  }

  // ── Create Streaming Response ───────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponseText = "";
      let resolvedSubject: PersonSummary | undefined;

      try {
        // Step 1: Agent 1 — Intent Parser
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "parsing",
            label: "Đang phân tích câu hỏi...",
          })
        );

        const intent = await parseIntent(message, previousMessages);

        // Step 2: Agent 2 — DB Search
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "searching",
            label: "Đang tìm kiếm trong gia phả...",
          })
        );

        const candidates = intent.subject.trim()
          ? await searchPersons(intent.subject)
          : [];

        // Step 3: Agent 3 — Verifier
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "verifying",
            label: "Xác minh danh tính...",
          })
        );

        const verification = verifyCandidates(candidates);

        // Phase 3 will add Agent 4 (Clarifier) for FOUND_MANY.
        // For Phase 2: treat FOUND_MANY as FOUND_ONE — use top result.
        const subject =
          verification.status === "FOUND_ONE"
            ? verification.subject
            : verification.status === "FOUND_MANY"
              ? verification.candidates[0]
              : null;

        if (subject) {
          resolvedSubject = {
            id: subject.id,
            full_name: subject.full_name,
            generation: subject.generation,
            birth_year: subject.birth_year,
            death_year: subject.death_year,
            is_deceased: subject.is_deceased,
          };
        }

        // Step 4: Agent 5 — Narrator (streaming LLM)
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "narrating",
            label: "Tổng hợp hồ sơ...",
          })
        );

        for await (const chunk of narrateResponse(
          intent,
          subject,
          previousMessages
        )) {
          controller.enqueue(encodeChunk(chunk));
          if (chunk.type === "text") {
            fullResponseText += chunk.delta;
          }
          if (chunk.type === "error") {
            // Still emit done so client knows stream ended
            break;
          }
        }

        // ── Persist to chat_sessions ────────────────────────
        const userMessage: ChatMessage = {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        };
        const aiMessage: ChatMessage = {
          role: "assistant",
          content: fullResponseText,
          timestamp: new Date().toISOString(),
          subject_id: resolvedSubject?.id,
          metadata: {
            query_type: intent.query_type,
          },
        };

        const updatedMessages = [...previousMessages, userMessage, aiMessage];

        // Auto-generate session title from first user message (80 char limit)
        const title =
          previousMessages.length === 0 ? message.slice(0, 80) : undefined;

        const { data: savedSession } = await supabase
          .from("chat_sessions")
          .upsert({
            ...(sessionId ? { id: sessionId } : {}),
            user_id: user.id,
            messages: updatedMessages,
            scratchpad: resolvedSubject
              ? { confirmed_subject_id: resolvedSubject.id }
              : {},
            ...(title ? { title } : {}),
          })
          .select("id")
          .single();

        const finalSessionId = savedSession?.id ?? sessionId ?? "unknown";

        // ── Done chunk ────────────────────────────────────────
        controller.enqueue(
          encodeChunk({
            type: "done",
            sessionId: finalSessionId,
            subject: resolvedSubject,
          })
        );
      } catch (error) {
        console.error({ error }, "POST /api/chat pipeline error");
        controller.enqueue(
          encodeChunk({
            type: "error",
            message: "Có lỗi xảy ra. Vui lòng thử lại.",
            code: "PIPELINE_ERROR",
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

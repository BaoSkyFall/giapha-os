import { getSupabase, getUser } from "@/utils/supabase/queries";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  StructuredAnswerPayload,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

const BACK_END_AI_URL = process.env.BACK_END_AI_URL ?? "http://localhost:5000";

function encodeChunk(chunk: StreamChunk): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(chunk) + "\n");
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  const isAuthenticated = !!user;

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    message,
    selected_person_id,
    session_id,
    messages: historyMessages = [],
    session_source = "local",
  } = body;

  if (!message?.trim() && !selected_person_id) {
    return new Response(JSON.stringify({ error: "message or selected_person_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only persist to Supabase when: user is logged in AND session was started as "supabase"
  const persistToSupabase = isAuthenticated && session_source === "supabase";
  const supabase = persistToSupabase ? await getSupabase() : null;

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponseText = "";
      let structuredPayload: StructuredAnswerPayload | undefined;

      try {
        // Gửi trạng thái tìm kiếm tức thì
        controller.enqueue(
          encodeChunk({ type: "agent_step", step: "searching", label: "Đang tra cứu cây gia phả..." })
        );

        // Gọi trực tiếp Genealogy Engine backend (Zero LLM, sub-50ms)
        const backendRes = await fetch(`${BACK_END_AI_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: message || "",
            selected_person_id: selected_person_id || undefined,
            session_id: session_id || undefined,
            role: isAuthenticated ? "member" : "public",
            ...(historyMessages.length > 0 ? { messages: historyMessages } : {}),
          }),
        });

        if (!backendRes.ok) {
          throw new Error(`Backend HTTP ${backendRes.status}`);
        }

        const raw = (await backendRes.json()) as StructuredAnswerPayload;
        structuredPayload = raw;

        if (typeof raw?.message === "string" && raw.message.trim()) {
          fullResponseText = raw.message.trim();
        } else if (typeof raw?.answer === "string" && raw.answer.trim()) {
          fullResponseText = raw.answer.trim();
        } else {
          fullResponseText = "Thông tin đã được cập nhật từ hệ thống gia phả.";
        }

        // Gửi structured chunk về client để render Cards
        controller.enqueue(
          encodeChunk({
            type: "structured",
            payload: raw,
          })
        );

        // Gửi text chunk để backward-compatible
        controller.enqueue(encodeChunk({ type: "text", delta: fullResponseText }));

        // ── Supabase persistence (logged-in + supabase-source sessions only) ──
        let finalSessionId = session_id ?? "unknown";
        if (persistToSupabase && supabase) {
          const allMessages: ChatMessage[] = [
            ...historyMessages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date().toISOString(),
            })),
            {
              role: "user" as const,
              content: message || "Tra cứu theo lựa chọn",
              timestamp: new Date().toISOString(),
            },
            {
              role: "assistant" as const,
              content: fullResponseText,
              timestamp: new Date().toISOString(),
              response_type: structuredPayload?.type,
              candidates: structuredPayload?.candidates,
              suggestions: structuredPayload?.suggestions,
              data: structuredPayload?.data,
              meta: structuredPayload?.meta,
            },
          ];
          const title = historyMessages.length === 0 ? (message || "Tra cứu gia phả").slice(0, 80) : undefined;
          const { data: savedSession } = await supabase
            .from("chat_sessions")
            .upsert({
              ...(session_id ? { id: session_id } : {}),
              user_id: user!.id,
              messages: allMessages,
              scratchpad: {},
              ...(title ? { title } : {}),
            })
            .select("id")
            .single();
          finalSessionId = savedSession?.id ?? session_id ?? "unknown";
        }

        controller.enqueue(encodeChunk({ type: "done", sessionId: finalSessionId }));
      } catch (error) {
        console.error({ error }, "POST /api/chat proxy error");
        controller.enqueue(
          encodeChunk({
            type: "error",
            message:
              "Không thể kết nối đến máy chủ tra cứu gia phả (Genealogy Knowledge Engine). Vui lòng thử lại sau giây lát.",
            code: "NETWORK_ERROR",
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

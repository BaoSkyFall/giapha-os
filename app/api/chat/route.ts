import { getSupabase, getUser } from "@/utils/supabase/queries";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  AgentStep,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

const BACK_END_AI_URL = process.env.BACK_END_AI_URL ?? "http://localhost:5000";

const SIMULATED_STEPS: Array<{ step: AgentStep; label: string; at: number }> = [
  { step: "parsing",   label: "Đang phân tích câu hỏi...",         at: 300  },
  { step: "searching", label: "Truy vấn cơ sở dữ liệu gia phả...", at: 2500 },
  { step: "verifying", label: "Xác minh danh tính thành viên...",  at: 5000 },
  { step: "narrating", label: "Tổng hợp hồ sơ thành viên...",      at: 8000 },
];

function encodeChunk(chunk: StreamChunk): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(chunk) + "\n");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BackendResponse {
  answer?: string;
  sources?: string[];
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
    session_id,
    messages: historyMessages = [],
    session_source = "local",
  } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
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
      const startTime = Date.now();

      try {
        // Fire backend request immediately
        const backendPromise = fetch(`${BACK_END_AI_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: message,
            ...(historyMessages.length > 0 ? { messages: historyMessages } : {}),
          }),
        });

        // Emit simulated steps concurrently
        let stepIdx = 0;
        const emitNextStep = async (): Promise<void> => {
          if (stepIdx >= SIMULATED_STEPS.length) return;
          const { step, label, at } = SIMULATED_STEPS[stepIdx++];
          const elapsed = Date.now() - startTime;
          const remaining = at - elapsed;
          if (remaining > 0) await wait(remaining);
          controller.enqueue(encodeChunk({ type: "agent_step", step, label }));
          return emitNextStep();
        };

        const [backendRes] = await Promise.all([backendPromise, emitNextStep()]);

        if (!backendRes.ok) {
          throw new Error(`Backend HTTP ${backendRes.status}`);
        }

        const raw = await backendRes.json() as BackendResponse;
        if (typeof raw?.answer === "string" && raw.answer.trim()) {
          fullResponseText = raw.answer.trim();
        } else if (typeof raw === "string") {
          fullResponseText = raw as string;
        } else {
          fullResponseText = "Không tìm thấy câu trả lời.";
        }

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
            { role: "user" as const,      content: message,          timestamp: new Date().toISOString() },
            { role: "assistant" as const, content: fullResponseText, timestamp: new Date().toISOString() },
          ];
          const title = historyMessages.length === 0 ? message.slice(0, 80) : undefined;
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
            message: "Có lỗi kết nối với trợ lý AI. Vui lòng thử lại.",
            code: "BACKEND_ERROR",
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

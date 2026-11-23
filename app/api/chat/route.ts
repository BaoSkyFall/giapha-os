import { getSupabase, getUser } from "@/utils/supabase/queries";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  StructuredAnswerPayload,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

const BACK_END_AI_URL = process.env.BACK_END_AI_URL ?? "http://localhost:5000";
const AI_SERVICE_INTERNAL_KEY = process.env.AI_SERVICE_INTERNAL_KEY ?? "";
const BACKEND_TIMEOUT_MS = 15_000;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;

function encodeChunk(chunk: StreamChunk): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(chunk) + "\n");
}

function sanitizeHistoryMessages(
  rawMessages: unknown
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(rawMessages)) return [];
  const valid: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of rawMessages) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const role = record.role;
    const content = record.content;
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim().length > 0
    ) {
      valid.push({
        role,
        content: content.slice(0, 4000),
      });
    }
  }
  return valid.slice(-MAX_HISTORY_MESSAGES);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  const isAuthenticated = !!user;

  // Verify active profile & role from Supabase (fail-closed to "public")
  let verifiedRole: "public" | "member" | "admin" = "public";
  const authSupabase = isAuthenticated ? await getSupabase() : null;
  if (isAuthenticated && authSupabase) {
    const { data: profile, error: profileError } = await authSupabase
      .from("profiles")
      .select("is_active, role")
      .eq("id", user!.id)
      .single();
    if (!profileError && profile?.is_active === true) {
      verifiedRole = profile.role === "admin" ? "admin" : "member";
    }
  }

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
    messages: rawHistoryMessages,
    session_source = "local",
  } = body;

  if (typeof message === "string" && message.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Câu hỏi vượt quá giới hạn ${MAX_MESSAGE_LENGTH} ký tự.`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!message?.trim() && !selected_person_id) {
    return new Response(
      JSON.stringify({ error: "message or selected_person_id is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const sanitizedHistory = sanitizeHistoryMessages(rawHistoryMessages);

  // Only persist to Supabase when: user is logged in AND session was started as "supabase"
  const persistToSupabase = isAuthenticated && session_source === "supabase";
  const supabase = persistToSupabase ? await getSupabase() : null;

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponseText = "";
      let structuredPayload: StructuredAnswerPayload | undefined;

      try {
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "searching",
            label: "Đang tra cứu cây gia phả...",
          })
        );

        const controllerAbort = new AbortController();
        const timeoutId = setTimeout(
          () => controllerAbort.abort(),
          BACKEND_TIMEOUT_MS
        );
        let backendRes: Response;
        try {
          backendRes = await fetch(`${BACK_END_AI_URL}/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(AI_SERVICE_INTERNAL_KEY
                ? { "X-Internal-Key": AI_SERVICE_INTERNAL_KEY }
                : {}),
            },
            signal: controllerAbort.signal,
            body: JSON.stringify({
              question: (message || "").trim(),
              selected_person_id: selected_person_id || undefined,
              session_id: session_id || undefined,
              role: verifiedRole,
              ...(sanitizedHistory.length > 0
                ? { messages: sanitizedHistory }
                : {}),
            }),
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!backendRes.ok) {
          throw new Error(`Backend HTTP ${backendRes.status}`);
        }

        const raw = (await backendRes.json()) as StructuredAnswerPayload;
        const normalizedPayload: StructuredAnswerPayload = {
          ...raw,
          provenance: raw.provenance,
          verification_status: raw.verification_status,
          data_completeness: raw.data_completeness,
          missing_fields: raw.missing_fields,
          reason_code: raw.reason_code,
          is_demo_data: raw.is_demo_data,
          sources: raw.sources,
          meta: raw.meta,
        };
        structuredPayload = normalizedPayload;

        if (typeof raw?.message === "string" && raw.message.trim()) {
          fullResponseText = raw.message.trim();
        } else if (typeof raw?.answer === "string" && raw.answer.trim()) {
          fullResponseText = raw.answer.trim();
        } else {
          fullResponseText =
            "Thông tin đã được cập nhật từ hệ thống gia phả.";
        }

        controller.enqueue(
          encodeChunk({
            type: "structured",
            payload: normalizedPayload,
          })
        );

        controller.enqueue(
          encodeChunk({ type: "text", delta: fullResponseText })
        );

        let finalSessionId = session_id ?? "unknown";
        if (persistToSupabase && supabase) {
          const allMessages: ChatMessage[] = [
            ...sanitizedHistory.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: new Date().toISOString(),
            })),
            {
              role: "user" as const,
              content: (message || "").trim() || "Tra cứu theo lựa chọn",
              timestamp: new Date().toISOString(),
            },
            {
              role: "assistant" as const,
              content: fullResponseText,
              timestamp: new Date().toISOString(),
              response_type: structuredPayload?.type,
              candidates: structuredPayload?.candidates,
              suggestions: structuredPayload?.suggestions,
              reasoning_steps: structuredPayload?.reasoning_steps,
              data: structuredPayload?.data,
              verification_status: structuredPayload?.verification_status,
              data_completeness: structuredPayload?.data_completeness,
              missing_fields: structuredPayload?.missing_fields,
              provenance: structuredPayload?.provenance,
              reason_code: structuredPayload?.reason_code,
              is_demo_data: structuredPayload?.is_demo_data,
              sources: structuredPayload?.sources,
              meta: structuredPayload?.meta,
            },
          ];
          const title =
            sanitizedHistory.length === 0
              ? ((message || "").trim() || "Tra cứu gia phả").slice(0, 80)
              : undefined;
          const { data: savedSession, error: upsertError } = await supabase
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
          if (upsertError) {
            console.error({ upsertError }, "chat_sessions upsert error");
          }
          finalSessionId = savedSession?.id ?? session_id ?? "unknown";
        }

        controller.enqueue(
          encodeChunk({ type: "done", sessionId: finalSessionId })
        );
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

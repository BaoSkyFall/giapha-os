import { getSupabase, getUser } from "@/utils/supabase/queries";
import { parseIntent } from "@/utils/ai-advisor/agent1-intent-parser";
import { searchPersons } from "@/utils/ai-advisor/agent2-db-search";
import { verifyCandidates } from "@/utils/ai-advisor/agent3-verifier";
import { generateClarification } from "@/utils/ai-advisor/agent4-clarifier";
import { narrateResponse } from "@/utils/ai-advisor/agent5-narrator";
import { computeKinship } from "@/utils/ai-advisor/kinship-resolver";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  ChatScratchpad,
  PersonSummary,
  PersonSearchResult,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

const MAX_CLARIFICATION_ROUNDS = 2;

// Pronoun/reference words that indicate "same person as before"
const PRONOUN_PATTERNS =
  /^(ông|bà|cụ|anh|chị|em|ngài|họ|người đó|ông ấy|bà ấy|ngài ấy)$/i;

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
  let scratchpad: ChatScratchpad = {};

  if (sessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("messages, scratchpad")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (session) {
      previousMessages = (session.messages as ChatMessage[]) ?? [];
      scratchpad = (session.scratchpad as ChatScratchpad) ?? {};
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
      let updatedScratchpad: ChatScratchpad = { ...scratchpad };

      try {
        // ── Agent 1: Intent Parser ──────────────────────────
        controller.enqueue(
          encodeChunk({
            type: "agent_step",
            step: "parsing",
            label: "Đang phân tích câu hỏi...",
          })
        );

        const intent = await parseIntent(message, previousMessages);

        // ── Off-topic short-circuit (greetings, chit-chat) ──────
        if (intent.query_type === "off_topic") {
          const reply =
            intent.language === "vi"
              ? "Xin chào! Tôi là Trợ lý AI Gia Phả — tôi chuyên trả lời câu hỏi về thành viên, lịch sử và sự kiện trong dòng họ. Bạn muốn hỏi về ai trong gia tộc không? 🏮"
              : "Hello! I'm the Family Tree AI Advisor — I specialize in answering questions about your family members, history, and lineage. Who in the family would you like to ask about? 🏮";
          fullResponseText = reply;
          controller.enqueue(encodeChunk({ type: "text", delta: reply }));
          // Skip all other agents — save and close below
          const userMsg: ChatMessage = { role: "user", content: message, timestamp: new Date().toISOString() };
          const aiMsg: ChatMessage = { role: "assistant", content: reply, timestamp: new Date().toISOString() };
          const updatedMsgs = [...previousMessages, userMsg, aiMsg];
          const { data: saved } = await supabase
            .from("chat_sessions")
            .upsert({
              ...(sessionId ? { id: sessionId } : {}),
              user_id: user.id,
              messages: updatedMsgs,
              scratchpad: updatedScratchpad,
              ...(previousMessages.length === 0 ? { title: message.slice(0, 80) } : {}),
            })
            .select("id")
            .single();
          controller.enqueue(encodeChunk({ type: "done", sessionId: saved?.id ?? sessionId ?? "unknown" }));
          controller.close();
          return;
        }

        // ── Detect pronoun reference (use confirmed subject) ──
        const isPronounRef =
          !intent.subject.trim() ||
          PRONOUN_PATTERNS.test(intent.subject.trim());

        if (isPronounRef && scratchpad.confirmed_subject_id) {
          // ── Fast-path: confirmed subject re-use ─────────────
          controller.enqueue(
            encodeChunk({
              type: "agent_step",
              step: "searching",
              label: "Đang tải thông tin...",
            })
          );
          controller.enqueue(
            encodeChunk({
              type: "agent_step",
              step: "verifying",
              label: "Xác minh danh tính...",
            })
          );

          const { data: confirmedPerson } = await supabase
            .from("persons")
            .select(
              "id, full_name, other_names, generation, birth_year, death_year, is_deceased, gender"
            )
            .eq("id", scratchpad.confirmed_subject_id)
            .single();

          if (confirmedPerson) {
            resolvedSubject = confirmedPerson as PersonSummary;

            controller.enqueue(
              encodeChunk({
                type: "agent_step",
                step: "narrating",
                label: "Tổng hợp hồ sơ...",
              })
            );

            for await (const chunk of narrateResponse(
              intent,
              confirmedPerson as PersonSearchResult,
              previousMessages
            )) {
              controller.enqueue(encodeChunk(chunk));
              if (chunk.type === "text") fullResponseText += chunk.delta;
              if (chunk.type === "error") break;
            }
          }
        } else if (
          scratchpad.pending_clarification &&
          scratchpad.candidates?.length
        ) {
          // ── Re-search path: user replied to disambiguation ──
          const round = scratchpad.clarification_round ?? 0;
          const savedCandidateName = scratchpad.candidates[0].full_name;

          controller.enqueue(
            encodeChunk({
              type: "agent_step",
              step: "searching",
              label: "Đang tìm kiếm lại...",
            })
          );

          // Combined query: original name + user clarification for better trigram match
          const combinedQuery = `${savedCandidateName} ${message}`;
          const reCandidates = await searchPersons(combinedQuery);

          controller.enqueue(
            encodeChunk({
              type: "agent_step",
              step: "verifying",
              label: "Xác minh danh tính...",
            })
          );

          const reVerification = verifyCandidates(reCandidates);

          if (reVerification.status === "FOUND_ONE") {
            // Resolved — save confirmed subject and narrate
            resolvedSubject = {
              id: reVerification.subject.id,
              full_name: reVerification.subject.full_name,
              generation: reVerification.subject.generation,
              birth_year: reVerification.subject.birth_year,
              death_year: reVerification.subject.death_year,
              is_deceased: reVerification.subject.is_deceased,
            };
            updatedScratchpad = {
              confirmed_subject_id: reVerification.subject.id,
              pending_clarification: false,
              clarification_round: 0,
            };

            controller.enqueue(
              encodeChunk({
                type: "agent_step",
                step: "narrating",
                label: "Tổng hợp hồ sơ...",
              })
            );

            for await (const chunk of narrateResponse(
              intent,
              reVerification.subject,
              previousMessages
            )) {
              controller.enqueue(encodeChunk(chunk));
              if (chunk.type === "text") fullResponseText += chunk.delta;
              if (chunk.type === "error") break;
            }
          } else if (
            reVerification.status === "FOUND_MANY" &&
            round < MAX_CLARIFICATION_ROUNDS
          ) {
            // Ask again (increment round)
            const newCandidates = reVerification.candidates;
            const question = await generateClarification(
              savedCandidateName,
              newCandidates
            );
            updatedScratchpad = {
              ...updatedScratchpad,
              pending_clarification: true,
              candidates: newCandidates,
              clarification_round: round + 1,
            };
            controller.enqueue(
              encodeChunk({ type: "clarify", question, candidates: newCandidates })
            );
            fullResponseText = question;
          } else {
            // Max rounds reached or FOUND_NONE — graceful fallback via Narrator
            updatedScratchpad = {
              pending_clarification: false,
              clarification_round: 0,
            };

            controller.enqueue(
              encodeChunk({
                type: "agent_step",
                step: "narrating",
                label: "Tổng hợp câu trả lời...",
              })
            );

            for await (const chunk of narrateResponse(
              intent,
              null,
              previousMessages
            )) {
              controller.enqueue(encodeChunk(chunk));
              if (chunk.type === "text") fullResponseText += chunk.delta;
              if (chunk.type === "error") break;
            }
          }
        } else {
          // ── Normal search path ──────────────────────────────
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

          controller.enqueue(
            encodeChunk({
              type: "agent_step",
              step: "verifying",
              label: "Xác minh danh tính...",
            })
          );

          const verification = verifyCandidates(candidates);

          if (verification.status === "FOUND_NONE") {
            // Not found — let Narrator compose a graceful "not found" reply
            controller.enqueue(
              encodeChunk({
                type: "agent_step",
                step: "narrating",
                label: "Tổng hợp câu trả lời...",
              })
            );
            for await (const chunk of narrateResponse(
              intent,
              null,
              previousMessages
            )) {
              controller.enqueue(encodeChunk(chunk));
              if (chunk.type === "text") fullResponseText += chunk.delta;
              if (chunk.type === "error") break;
            }
          } else if (verification.status === "FOUND_ONE") {
            // Exact match — save and narrate
            resolvedSubject = {
              id: verification.subject.id,
              full_name: verification.subject.full_name,
              generation: verification.subject.generation,
              birth_year: verification.subject.birth_year,
              death_year: verification.subject.death_year,
              is_deceased: verification.subject.is_deceased,
            };
            updatedScratchpad = {
              confirmed_subject_id: verification.subject.id,
              pending_clarification: false,
              clarification_round: 0,
            };

            // ── Kinship computation for relationship queries ──────
            let kinshipContext: string | undefined;
            if (intent.query_type === "relationship" && intent.related_to) {
              const relatedCandidates = await searchPersons(intent.related_to);
              const relatedVerification = verifyCandidates(relatedCandidates);
              if (relatedVerification.status === "FOUND_ONE") {
                const relatedPerson = relatedVerification.subject;
                const kinship = await computeKinship(
                  verification.subject.id,
                  relatedPerson.id
                );
                const lang = intent.language;
                if (kinship) {
                  kinshipContext = lang === "vi"
                    ? `Quan hệ đã tính toán: ${verification.subject.full_name} là ${kinship.relationship_vi} của ${relatedPerson.full_name}. Đường dẫn: ${kinship.path || "trực tiếp"}.`
                    : `Computed relationship: ${verification.subject.full_name} is the ${kinship.relationship_en} of ${relatedPerson.full_name}. Path: ${kinship.path || "direct"}.`;
                }
              }
            }

            controller.enqueue(
              encodeChunk({
                type: "agent_step",
                step: "narrating",
                label: "Tổng hợp hồ sơ...",
              })
            );

            for await (const chunk of narrateResponse(
              intent,
              verification.subject,
              previousMessages,
              kinshipContext
            )) {
              controller.enqueue(encodeChunk(chunk));
              if (chunk.type === "text") fullResponseText += chunk.delta;
              if (chunk.type === "error") break;
            }
          } else {
            // FOUND_MANY — trigger Agent 4 disambiguation
            const question = await generateClarification(
              intent.subject,
              verification.candidates
            );
            updatedScratchpad = {
              pending_clarification: true,
              candidates: verification.candidates,
              clarification_round: 0,
            };
            controller.enqueue(
              encodeChunk({
                type: "clarify",
                question,
                candidates: verification.candidates,
              })
            );
            fullResponseText = question;
          }
        }

        // ── Persist turn to chat_sessions ───────────────────
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
          metadata: { query_type: intent.query_type },
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
            scratchpad: updatedScratchpad,
            ...(title ? { title } : {}),
          })
          .select("id")
          .single();

        const finalSessionId = savedSession?.id ?? sessionId ?? "unknown";

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

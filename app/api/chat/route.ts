import { getSupabase, getUser } from "@/utils/supabase/queries";
import { parseIntent } from "@/utils/ai-advisor/agent1-intent-parser";
import { searchPersons } from "@/utils/ai-advisor/agent2-db-search";
import { verifyCandidates } from "@/utils/ai-advisor/agent3-verifier";
import { generateClarification } from "@/utils/ai-advisor/agent4-clarifier";
import { narrateResponse } from "@/utils/ai-advisor/agent5-narrator";
import { computeKinship } from "@/utils/ai-advisor/kinship-resolver";
import { FAQ_CHIPS } from "@/app/ai-advisor/data";
import type {
  ChatRequestBody,
  StreamChunk,
  ChatMessage,
  ChatScratchpad,
  PersonSummary,
  PersonSearchResult,
} from "@/types/ai-advisor";
import { NextRequest } from "next/server";

// Build static FAQ knowledge string injected into the narrator for site_info queries
const SITE_KNOWLEDGE_CONTEXT = [
  "Thông tin về trang web Tộc Phạm Phú (dùng để trả lời câu hỏi về website, sứ mệnh, quyền riêng tư, điều khoản, cách sử dụng):",
  ...FAQ_CHIPS.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`),
].join("\n\n");

const MAX_CLARIFICATION_ROUNDS = 2;

// Pronoun/reference words that indicate "same person as before"
const PRONOUN_PATTERNS =
  /^(ông|bà|cụ|anh|chị|em|ngài|họ|người đó|ông ấy|bà ấy|ngài ấy)$/i;

function encodeChunk(chunk: StreamChunk): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(chunk) + "\n");
}

export async function POST(request: NextRequest) {
  // ── Auth (anonymous allowed) ─────────────────────────────────
  const user = await getUser();
  const isAnonymous = !user;

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

  // ── Load Existing Session (authenticated users only) ─────────
  const supabase = await getSupabase();
  let sessionId: string | undefined = session_id;
  let previousMessages: ChatMessage[] = [];
  let scratchpad: ChatScratchpad = {};

  if (!isAnonymous && sessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("messages, scratchpad")
      .eq("id", sessionId)
      .eq("user_id", user!.id)
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
              ? "Xin chào! Tôi là Trợ lý AI Tộc Phạm Phú — tôi chuyên trả lời câu hỏi về thành viên, lịch sử và sự kiện trong dòng họ. Bạn muốn hỏi về ai trong gia tộc không? 🏮"
              : "Hello! I'm the Family Tree AI Advisor — I specialize in answering questions about your family members, history, and lineage. Who in the family would you like to ask about? 🏮";
          fullResponseText = reply;
          controller.enqueue(encodeChunk({ type: "text", delta: reply }));
          // Skip all other agents — save and close below
          const userMsg: ChatMessage = { role: "user", content: message, timestamp: new Date().toISOString() };
          const aiMsg: ChatMessage = { role: "assistant", content: reply, timestamp: new Date().toISOString() };
          const updatedMsgs = [...previousMessages, userMsg, aiMsg];
          let savedId = sessionId;
          if (!isAnonymous) {
            const { data: saved } = await supabase
              .from("chat_sessions")
              .upsert({
                ...(sessionId ? { id: sessionId } : {}),
                user_id: user!.id,
                messages: updatedMsgs,
                scratchpad: updatedScratchpad,
                ...(previousMessages.length === 0 ? { title: message.slice(0, 80) } : {}),
              })
              .select("id")
              .single();
            savedId = saved?.id ?? sessionId;
          }
          controller.enqueue(encodeChunk({ type: "done", sessionId: savedId ?? "unknown" }));
          controller.close();
          return;
        }

        // ── Site info short-circuit: answer website/policy/FAQ questions ──
        if (intent.query_type === "site_info") {
          controller.enqueue(encodeChunk({ type: "agent_step", step: "narrating", label: "Tra cứu thông tin trang web..." }));
          for await (const chunk of narrateResponse(
            intent,
            null,
            previousMessages,
            undefined,
            SITE_KNOWLEDGE_CONTEXT
          )) {
            controller.enqueue(encodeChunk(chunk));
            if (chunk.type === "text") fullResponseText += chunk.delta;
            if (chunk.type === "error") break;
          }
          const siteUserMsg: ChatMessage = { role: "user", content: message, timestamp: new Date().toISOString() };
          const siteAiMsg: ChatMessage = { role: "assistant", content: fullResponseText, timestamp: new Date().toISOString() };
          let siteSavedId = sessionId;
          if (!isAnonymous) {
            const { data: siteSaved } = await supabase
              .from("chat_sessions")
              .upsert({
                ...(sessionId ? { id: sessionId } : {}),
                user_id: user!.id,
                messages: [...previousMessages, siteUserMsg, siteAiMsg],
                scratchpad: updatedScratchpad,
                ...(previousMessages.length === 0 ? { title: message.slice(0, 80) } : {}),
              })
              .select("id")
              .single();
            siteSavedId = siteSaved?.id ?? sessionId;
          }
          controller.enqueue(encodeChunk({ type: "done", sessionId: siteSavedId ?? "unknown" }));
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

          const reVerification = verifyCandidates(reCandidates, savedCandidateName);

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

          const verification = verifyCandidates(candidates, intent.subject);

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
            // Fetch note separately (not returned by fuzzy RPC)
            const { data: noteData } = await supabase
              .from("persons")
              .select("note")
              .eq("id", verification.subject.id)
              .single();
            if (noteData?.note) {
              (verification.subject as PersonSearchResult).note = (noteData as { note: string }).note;
            }

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
              const relatedVerification = verifyCandidates(relatedCandidates, intent.related_to);
              if (relatedVerification.status === "FOUND_ONE") {
                const relatedPerson = relatedVerification.subject;
                const lang = intent.language;

                // Try full traversal first
                const kinship = await computeKinship(
                  verification.subject.id,
                  relatedPerson.id
                );

                const relatedInfo = lang === "vi"
                  ? `Thông tin về ${relatedPerson.full_name}: đời ${relatedPerson.generation ?? "?"}${relatedPerson.birth_year ? `, sinh ${relatedPerson.birth_year}` : ""}.`
                  : `About ${relatedPerson.full_name}: generation ${relatedPerson.generation ?? "?"}${relatedPerson.birth_year ? `, born ${relatedPerson.birth_year}` : ""}.`;

                if (kinship?.found) {
                  // Use the traversal result
                  const rel = lang === "vi" ? kinship.relationship_vi : kinship.relationship_en;
                  const pathNote = kinship.path ? ` Đường dẫn: ${kinship.path}.` : "";
                  kinshipContext = lang === "vi"
                    ? `${relatedInfo}\nQuan hệ đã tính toán: ${verification.subject.full_name} là ${rel} của ${relatedPerson.full_name}.${pathNote}`
                    : `${relatedInfo}\nComputed relationship: ${verification.subject.full_name} is the ${rel} of ${relatedPerson.full_name}.${kinship.path ? ` Path: ${kinship.path}.` : ""}`;
                } else {
                  // Fallback: use generation difference
                  const genDiff = (verification.subject.generation ?? 0) - (relatedPerson.generation ?? 0);
                  const genNote = genDiff > 0
                    ? lang === "vi"
                      ? `${verification.subject.full_name} (đời ${verification.subject.generation}) sinh sau ${relatedPerson.full_name} (đời ${relatedPerson.generation}) ${genDiff} thế hệ. Sử dụng dữ liệu cha/mẹ ID trong gia phả để truy vết mối quan hệ thực tế.`
                      : `${verification.subject.full_name} (gen ${verification.subject.generation}) is ${genDiff} generation(s) after ${relatedPerson.full_name} (gen ${relatedPerson.generation}). Use the parent ID data in the family records to trace the actual relationship.`
                    : lang === "vi"
                      ? `Hai người cùng đời hoặc ${relatedPerson.full_name} sinh sau.`
                      : `They are in the same generation or ${relatedPerson.full_name} is younger.`;
                  kinshipContext = lang === "vi"
                    ? `${relatedInfo}\n${genNote}`
                    : `${relatedInfo}\n${genNote}`;
                }

                console.info({ subjectId: verification.subject.id, relatedId: relatedPerson.id, kinshipFound: kinship?.found }, "Kinship computation result");
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

        let finalSessionId = sessionId ?? "unknown";
        if (!isAnonymous) {
          const { data: savedSession } = await supabase
            .from("chat_sessions")
            .upsert({
              ...(sessionId ? { id: sessionId } : {}),
              user_id: user!.id,
              messages: updatedMessages,
              scratchpad: updatedScratchpad,
              ...(title ? { title } : {}),
            })
            .select("id")
            .single();
          finalSessionId = savedSession?.id ?? sessionId ?? "unknown";
        }

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

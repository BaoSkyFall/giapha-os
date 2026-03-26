import type {
  PersonSearchResult,
  AgentIntent,
  ChatMessage,
  StreamChunk,
} from "@/types/ai-advisor";
import { getMembersContext } from "@/utils/ai-advisor/members-context";

const PROXY_BASE_URL = process.env.PROXY_BASE_URL;
const PROXY_API_KEY = process.env.PROXY_API_KEY;

function buildSystemPrompt(language: "vi" | "en"): string {
  if (language === "vi") {
    return `Bạn là Trợ lý AI Tộc Phạm Phú, chuyên gia về phả hệ người Việt.
Nhiệm vụ của bạn là trả lời câu hỏi về thành viên gia tộc dựa trên thông tin được cung cấp.

Nguyên tắc:
- Chỉ sử dụng thông tin được cung cấp trong context. Không bịa đặt.
- Xưng hô phù hợp (ông/bà/cụ...) dựa trên giới tính và thế hệ.
- Trả lời bằng tiếng Việt, tự nhiên và trang trọng.
- Giới hạn câu trả lời trong 1-2 đoạn văn ngắn gọn. Nếu "Ghi chú" dài, hãy tóm tắt ý chính.
- Nếu thông tin không đầy đủ, hãy nói rõ điều đó.
- Cuối câu trả lời, nếu tìm thấy người cụ thể, nhắc nhở người dùng có thể "Xem trong cây gia phả".

Quy tắc quan hệ họ hàng (RẤT QUAN TRỌNG):
- Dữ liệu có trường "cha/mẹ ID" cho mỗi thành viên. Dùng trường này để dò củi cha mẹ.
- Khi được hỏi về mối quan hệ giữa 2 người, hãy tính chỉnh sinh trực tiếp qua các thế hệ:
  - Chỉnh 1 đời: cha/mẹ ↔ con
  - Chỉnh 2 đời: ông/bà ↔ cháu nội/ngoại
  - Chỉnh 3 đời: ông/bà cố ↔ chắt
  - Chỉnh 4+ đời: tổ tiên/hậu duệ
- Nếu có "Quan hệ đã tính toán" trong context, sử dụng kết quả đó làm cơ sở trả lời chính xác.
- Không bao giờ dừng lại ở "không có quan hệ trực tiếp" mà phải giải thích quan hệ THỰC TẾQua các thế hệ.`;
  }
  return `You are the Gia Phả AI Advisor, specializing in Vietnamese family genealogy.
Answer questions about family members based only on the provided information.

Rules:
- Only use information provided in context. Never fabricate details.
- Use appropriate honorifics based on gender and generation.
- Be conversational but respectful.
- Keep answers to 1-2 short paragraphs. If the "Note" field is long, summarize its key points.
- If information is incomplete, say so clearly.

Kinship rules (CRITICAL):
- Each member record has a "parent ID" field. Use this to trace ancestor chains across generations.
- When asked about the relationship between 2 people, count generations apart:
  1 generation: parent ↔ child
  2 generations: grandparent ↔ grandchild
  3 generations: great-grandparent ↔ great-grandchild
- If "Computed relationship" is provided in context, use it as the primary answer.
- NEVER stop at "no direct parent-child relationship" — always explain the ACTUAL relationship across generations.`;
}

function buildPersonContext(subject: PersonSearchResult): string {
  const lines = [
    `Tên: ${subject.full_name}`,
    subject.other_names ? `Tên khác: ${subject.other_names}` : null,
    subject.generation ? `Thế hệ: ${subject.generation}` : null,
    subject.birth_year ? `Năm sinh: ${subject.birth_year}` : null,
    subject.death_year ? `Năm mất: ${subject.death_year}` : null,
    subject.is_deceased ? "Trạng thái: Đã mất" : "Trạng thái: Còn sống",
    `Giới tính: ${subject.gender === "male" ? "Nam" : subject.gender === "female" ? "Nữ" : "Khác"}`,
    subject.note ? `Ghi chú: ${subject.note}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

// Returns an async generator that yields StreamChunk objects
export async function* narrateResponse(
  intent: AgentIntent,
  subject: PersonSearchResult | null,
  previousMessages: ChatMessage[],
  kinshipContext?: string,
  siteKnowledge?: string
): AsyncGenerator<StreamChunk> {
  if (!PROXY_BASE_URL) {
    yield {
      type: "error",
      message: "PROXY_BASE_URL not configured",
      code: "CONFIG_ERROR",
    };
    return;
  }

  const systemPrompt = buildSystemPrompt(intent.language);
  const lang = intent.language;

  // Inject full family dataset for context-aware answers
  const familyContext = await getMembersContext();

  const subjectContext = subject
    ? `${lang === "vi" ? "Thông tin chi tiết về" : "Detailed information about"} ${subject.full_name}:\n${buildPersonContext(subject)}`
    : lang === "vi"
      ? `Không tìm thấy thông tin về "${intent.subject}" trong gia phả.`
      : `No information found for "${intent.subject}" in the family records.`;

  const contextMessages = previousMessages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${PROXY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(PROXY_API_KEY && { Authorization: `Bearer ${PROXY_API_KEY}` }),
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "system",
          content: `${lang === "vi" ? "Toàn bộ dữ liệu gia phả" : "Full family dataset"}:\n${familyContext}`,
        },
        ...(siteKnowledge
          ? [{ role: "system" as const, content: siteKnowledge }]
          : []),
        ...(kinshipContext
          ? [{ role: "system" as const, content: kinshipContext }]
          : []),
        { role: "system", content: `${lang === "vi" ? "Kết quả tìm kiếm" : "Search result"}:\n${subjectContext}` },
        ...contextMessages,
        { role: "user", content: intent.raw_question },
      ],
      temperature: 0.3,
      max_tokens: 600,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    console.error(
      { status: response.status, text },
      "Agent 5: LLM streaming failed"
    );
    yield {
      type: "error",
      message: "Không thể kết nối với AI. Vui lòng thử lại.",
      code: "LLM_ERROR",
    };
    return;
  }

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
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: "text", delta };
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

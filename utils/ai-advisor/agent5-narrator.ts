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
    return `Bạn là trợ lý AI Gia Phả, chuyên gia về phả hệ người Việt.
Nhiệm vụ của bạn là trả lời câu hỏi về thành viên gia tộc dựa trên thông tin được cung cấp.

Nguyên tắc:
- Chỉ sử dụng thông tin được cung cấp trong context. Không bịa đặt.
- Xưng hô phù hợp (ông/bà/cụ...) dựa trên giới tính và thế hệ.
- Trả lời bằng tiếng Việt, tự nhiên và trang trọng.
- Nếu thông tin không đầy đủ, hãy nói rõ điều đó.
- Cuối câu trả lời, nếu tìm thấy người cụ thể, nhắc nhở người dùng có thể "Xem trong cây gia phả".`;
  }
  return `You are the Gia Phả AI Advisor, specializing in Vietnamese family genealogy.
Answer questions about family members based only on the provided information.

Rules:
- Only use information provided in context. Never fabricate details.
- Use appropriate honorifics based on gender and generation.
- Be conversational but respectful.
- If information is incomplete, say so clearly.`;
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
  ].filter(Boolean);
  return lines.join("\n");
}

// Returns an async generator that yields StreamChunk objects
export async function* narrateResponse(
  intent: AgentIntent,
  subject: PersonSearchResult | null,
  previousMessages: ChatMessage[]
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

  // Inject full family dataset for context-aware answers
  const familyContext = await getMembersContext();

  const subjectContext = subject
    ? `Thông tin chi tiết về ${subject.full_name}:\n${buildPersonContext(subject)}`
    : `Không tìm thấy thông tin về "${intent.subject}" trong gia phả.`;

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
          content: `Toàn bộ dữ liệu gia phả:\n${familyContext}`,
        },
        { role: "system", content: `Kết quả tìm kiếm:\n${subjectContext}` },
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

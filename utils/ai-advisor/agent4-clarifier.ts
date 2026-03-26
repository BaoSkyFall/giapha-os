import type { PersonSearchResult } from "@/types/ai-advisor";

const PROXY_BASE_URL = process.env.PROXY_BASE_URL;
const PROXY_API_KEY = process.env.PROXY_API_KEY;

const MAX_CANDIDATES_TO_SHOW = 4;

const SYSTEM_PROMPT = `Bạn là Trợ lý AI Tộc Phạm Phú, chuyên gia về phả hệ người Việt.
Gia phả có nhiều người trùng tên. Hãy đặt MỘT câu hỏi ngắn gọn bằng tiếng Việt để xác định đúng người.

Định dạng bắt buộc:
"Gia phả có [N] người tên [tên]. Bạn đang hỏi về ai trong số những người sau?
- [Tên] (đời [X], sinh [Y])
- ..."

Chỉ xuất câu hỏi. Không thêm bất kỳ nội dung nào khác.`;

function buildCandidateList(candidates: PersonSearchResult[]): string {
  return candidates
    .slice(0, MAX_CANDIDATES_TO_SHOW)
    .map((p) => {
      const parts = [p.full_name];
      if (p.generation) parts.push(`đời ${p.generation}`);
      if (p.birth_year) parts.push(`sinh ${p.birth_year}`);
      if (p.death_year) parts.push(`mất ${p.death_year}`);
      return `- ${parts.join(", ")}`;
    })
    .join("\n");
}

function buildFallbackQuestion(candidates: PersonSearchResult[]): string {
  const name = candidates[0]?.full_name ?? "người này";
  const list = buildCandidateList(candidates);
  return `Gia phả có ${candidates.length} người tên ${name}. Bạn đang hỏi về ai trong số những người sau?\n${list}`;
}

export async function generateClarification(
  subjectName: string,
  candidates: PersonSearchResult[]
): Promise<string> {
  if (!PROXY_BASE_URL) {
    // Fallback: template-based question — no LLM required
    return buildFallbackQuestion(candidates);
  }

  const candidateList = buildCandidateList(candidates);
  const userPrompt = `Tên tìm kiếm: "${subjectName}"\nDanh sách (${candidates.length} người):\n${candidateList}`;

  const response = await fetch(`${PROXY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(PROXY_API_KEY && { Authorization: `Bearer ${PROXY_API_KEY}` }),
    },
    body: JSON.stringify({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 200,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      { status: response.status, text },
      "Agent 4: LLM clarification failed, using fallback"
    );
    return buildFallbackQuestion(candidates);
  }

  const data = await response.json();
  const question = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!question) {
    console.error({ data }, "Agent 4: empty LLM response, using fallback");
    return buildFallbackQuestion(candidates);
  }

  return question;
}

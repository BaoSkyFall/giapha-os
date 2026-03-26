import type { AgentIntent, ChatMessage } from "@/types/ai-advisor";

const PROXY_BASE_URL = process.env.PROXY_BASE_URL;
const PROXY_API_KEY = process.env.PROXY_API_KEY;

const SYSTEM_PROMPT = `You are a Vietnamese genealogy assistant intent parser.
Extract the person being asked about and the type of question.

Respond ONLY with valid JSON in this exact format:
{
  "subject": "<primary person name>",
  "related_to": "<second person name for relationship questions, or empty string>",
  "query_type": "<profile|relationship|fact|count|site_info|unknown>",
  "language": "<vi|en>"
}

Rules:
- subject: the primary person being asked about (keep Vietnamese diacritics)
- related_to: ONLY for relationship questions — the second person (e.g., "Is A the son of B?" → subject=A, related_to=B). Leave empty otherwise.
- query_type:
    profile = personal info about a family member
    relationship = family links/kinship between people
    fact = specific detail about a member
    count = numbers/statistics about members
    site_info = questions about the website itself (mission, purpose, privacy, terms of use, how to use, data storage, contact, pricing, account, password reset, admin contact — anything NOT about a specific family member)
    unknown = unclear intent
- language: detect from the question language
- If no specific person mentioned and the question is about the website/platform, set subject to "" and query_type to "site_info"
- If no specific person mentioned for other questions, set subject to "" and query_type to "unknown"
- Output ONLY the JSON object, no other text`;

// Detect greetings and clearly off-topic messages before calling LLM
const GREETING_PATTERN =
  /^(hi|hello|hey|howdy|xin chào|chào|chào bạn|alo|ok|okay|cảm ơn|camon|thanks|thank you|cảm ơn bạn|bye|tạm biệt|good morning|good afternoon|good evening|chào buổi sáng|haha|😊|👋|🙏|lol)\s*[!?.]*$/i;

export async function parseIntent(
  userMessage: string,
  previousMessages: ChatMessage[]
): Promise<AgentIntent> {
  // Fast-path: detect greetings/off-topic without LLM call
  if (GREETING_PATTERN.test(userMessage.trim())) {
    return {
      subject: "",
      query_type: "off_topic",
      language: /[àáảãạăắặẵẳâầẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(userMessage) ? "vi" : "en",
      raw_question: userMessage,
    };
  }

  if (!PROXY_BASE_URL) {
    throw new Error("PROXY_BASE_URL environment variable is not set");
  }

  // Build conversation context (last 4 messages for intent continuity)
  const context = previousMessages.slice(-4).map((m) => ({
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
        { role: "system", content: SYSTEM_PROMPT },
        ...context,
        { role: "user", content: userMessage },
      ],
      temperature: 0,
      max_tokens: 150,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Intent parser LLM failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const rawJson = data.choices?.[0]?.message?.content ?? "";

  try {
    // Strip markdown code fences if LLM wraps output (e.g. ```json ... ```)
    const stripped = rawJson.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(stripped);
    return {
      subject: parsed.subject ?? "",
      related_to: parsed.related_to || undefined,
      query_type: parsed.query_type ?? "unknown",
      language: parsed.language ?? "vi",
      raw_question: userMessage,
    };
  } catch {
    // Fallback: treat whole message as subject name, unknown type
    console.error({ rawJson }, "Agent 1: JSON parse failed, using fallback");
    return {
      subject: userMessage,
      query_type: "unknown",
      language: "vi",
      raw_question: userMessage,
    };
  }
}

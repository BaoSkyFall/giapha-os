import { getSupabase } from "@/utils/supabase/queries";

// Cached in module scope — reloaded per cold start (Vercel serverless function)
// At ~2,000 members ≈ 60-80KB — fits in LLM context window
let cachedContext: string | null = null;
let cachedAt: number | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PersonRecord {
  id: string;
  full_name: string;
  other_names: string | null;
  generation: number | null;
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
  gender: string;
  parent_id: string | null;
  note: string | null;
}

function formatPerson(p: PersonRecord): string {
  const parts = [`[${p.id}] ${p.full_name}`];
  if (p.other_names) parts.push(`còn gọi: ${p.other_names}`);
  if (p.generation) parts.push(`đời ${p.generation}`);
  if (p.birth_year) parts.push(`sinh ${p.birth_year}`);
  if (p.death_year) parts.push(`mất ${p.death_year}`);
  parts.push(p.is_deceased ? "(đã mất)" : "(còn sống)");
  if (p.parent_id) parts.push(`cha/mẹ ID: ${p.parent_id}`);
  if (p.note) parts.push(`ghi chú: ${p.note}`);
  return parts.join(", ");
}

export async function getMembersContext(): Promise<string> {
  const now = Date.now();
  if (cachedContext && cachedAt && now - cachedAt < CACHE_TTL_MS) {
    return cachedContext;
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("persons")
    .select(
      "id, full_name, other_names, generation, birth_year, death_year, is_deceased, gender, parent_id, note"
    )
    .order("generation", { ascending: true })
    .order("birth_year", { ascending: true });

  if (error || !data) {
    console.error({ error }, "getMembersContext: failed to load persons");
    return "Không thể tải dữ liệu gia phả.";
  }

  const lines = (data as PersonRecord[]).map(formatPerson);
  const context =
    `Danh sách thành viên gia tộc (${lines.length} người):\n` +
    lines.join("\n");

  cachedContext = context;
  cachedAt = now;
  return context;
}

import type { PersonSearchResult } from "@/types/ai-advisor";
import { getSupabase } from "@/utils/supabase/queries";

const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_MAX_RESULTS = 6;

export async function searchPersons(
  subjectName: string,
  threshold = DEFAULT_THRESHOLD,
  maxResults = DEFAULT_MAX_RESULTS
): Promise<PersonSearchResult[]> {
  if (!subjectName.trim()) {
    return [];
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("search_persons_fuzzy", {
    search_query: subjectName,
    similarity_threshold: threshold,
    max_results: maxResults,
  });

  if (error) {
    console.error(
      { error, subjectName },
      "Agent 2: RPC search_persons_fuzzy failed"
    );
    return [];
  }

  return (data as PersonSearchResult[]) ?? [];
}

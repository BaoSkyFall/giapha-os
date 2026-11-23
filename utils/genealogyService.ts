import { Person, Relationship } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export const LIST_PERSON_COLUMNS =
  "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, avatar_url, is_deceased, is_in_law, birth_order, generation, branch";

export const TREE_PERSON_COLUMNS =
  "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, avatar_url, note, is_deceased, is_in_law, birth_order, generation, branch";

export const FOUNDER_ROOT_ID = "0911c310-31cd-43c2-a705-67770bd074df";

export interface SubtreeResult {
  rootPerson: Person | null;
  persons: Person[];
  relationships: Relationship[];
}

/**
 * Tải cây con (subtree) theo bán kính depth (mặc định 2) từ rootId.
 * Truy vấn tuần tự theo thế hệ để chỉ kéo dữ liệu thực sự cần hiển thị,
 * không bao giờ tải 100% DB.
 */
export async function fetchGenealogySubtree(
  supabase: SupabaseClient,
  rootId: string,
  depth = 2,
): Promise<SubtreeResult> {
  const collectedPersons = new Map<string, Person>();
  const collectedRelationships = new Map<string, Relationship>();

  // 1. Fetch root
  const { data: rootPerson, error: rootError } = await supabase
    .from("persons")
    .select(TREE_PERSON_COLUMNS)
    .eq("id", rootId)
    .single();

  if (rootError || !rootPerson) {
    return {
      rootPerson: null,
      persons: [],
      relationships: [],
    };
  }

  const root = rootPerson as Person;
  collectedPersons.set(rootId, root);

  let currentLevelPersonIds = new Set<string>([rootId]);
  const visitedParentIds = new Set<string>();

  for (let currentDepth = 0; currentDepth < depth; currentDepth++) {
    if (currentLevelPersonIds.size === 0) break;

    const parentIdsToQuery = Array.from(currentLevelPersonIds).filter(
      (id) => !visitedParentIds.has(id),
    );
    if (parentIdsToQuery.length === 0) break;

    for (const id of parentIdsToQuery) {
      visitedParentIds.add(id);
    }

    // Parallel fetch: spouses and children
    const [marriageResults, childResults] = await Promise.all([
      supabase
        .from("relationships")
        .select("*")
        .eq("type", "marriage")
        .or(
          `person_a.in.(${parentIdsToQuery.join(",")}),person_b.in.(${parentIdsToQuery.join(",")})`,
        ),
      supabase
        .from("relationships")
        .select("*")
        .in("type", ["biological_child", "adopted_child"])
        .in("person_a", parentIdsToQuery),
    ]);

    const marriages = (marriageResults.data as Relationship[]) ?? [];
    const childRels = (childResults.data as Relationship[]) ?? [];

    const nextLevelPersonIds = new Set<string>();
    const personIdsToFetch = new Set<string>();

    for (const rel of marriages) {
      collectedRelationships.set(rel.id, rel);
      if (!collectedPersons.has(rel.person_a)) personIdsToFetch.add(rel.person_a);
      if (!collectedPersons.has(rel.person_b)) personIdsToFetch.add(rel.person_b);
    }

    for (const rel of childRels) {
      collectedRelationships.set(rel.id, rel);
      nextLevelPersonIds.add(rel.person_b);
      if (!collectedPersons.has(rel.person_b)) personIdsToFetch.add(rel.person_b);
    }

    if (personIdsToFetch.size > 0) {
      const idsArray = Array.from(personIdsToFetch);
      const CHUNK_SIZE = 100;
      for (let i = 0; i < idsArray.length; i += CHUNK_SIZE) {
        const chunk = idsArray.slice(i, i + CHUNK_SIZE);
        const { data: newPersons } = await supabase
          .from("persons")
          .select(TREE_PERSON_COLUMNS)
          .in("id", chunk);

        if (newPersons) {
          for (const p of newPersons as Person[]) {
            collectedPersons.set(p.id, p);
          }
        }
      }
    }

    currentLevelPersonIds = nextLevelPersonIds;
  }

  // Also fetch parent relationships of root (for "Lên đời trước" context)
  const { data: upperRels } = await supabase
    .from("relationships")
    .select("*")
    .in("type", ["biological_child", "adopted_child"])
    .eq("person_b", rootId);

  if (upperRels && upperRels.length > 0) {
    const parentIdsToFetch: string[] = [];
    for (const rel of upperRels as Relationship[]) {
      collectedRelationships.set(rel.id, rel);
      if (!collectedPersons.has(rel.person_a)) {
        parentIdsToFetch.push(rel.person_a);
      }
    }

    if (parentIdsToFetch.length > 0) {
      const { data: upperPersons } = await supabase
        .from("persons")
        .select(TREE_PERSON_COLUMNS)
        .in("id", parentIdsToFetch);

      if (upperPersons) {
        for (const p of upperPersons as Person[]) {
          collectedPersons.set(p.id, p);
        }
      }
    }
  }

  return {
    rootPerson: root,
    persons: Array.from(collectedPersons.values()),
    relationships: Array.from(collectedRelationships.values()),
  };
}

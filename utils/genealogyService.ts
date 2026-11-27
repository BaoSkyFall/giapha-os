import { Person, Relationship } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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

export interface FullGraphResult {
  persons: Person[];
  relationships: Relationship[];
  totalPersonsInDatabase: number;
  dataSource: "supabase" | "local_dump";
}

const LOCAL_DUMP_CANDIDATES = [
  path.resolve(process.cwd(), "local_dump_data.json"),
  path.resolve(process.cwd(), "..", "rag-langchain-giapha", "local_dump_data.json"),
];

export function loadLocalDumpData(): {
  persons: Person[];
  relationships: Relationship[];
} | null {
  for (const candidate of LOCAL_DUMP_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw) as {
          persons?: Person[];
          relationships?: Relationship[];
        };
        if (Array.isArray(parsed.persons) && parsed.persons.length > 0) {
          return {
            persons: parsed.persons,
            relationships: Array.isArray(parsed.relationships)
              ? parsed.relationships
              : [],
          };
        }
      }
    } catch {
      // ignore invalid dump candidate
    }
  }
  return null;
}

async function fetchAllPaginated<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await queryFactory(offset, offset + pageSize - 1);
    if (error || !data) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

/**
 * Tải toàn bộ đồ thị gia phả (~4.000+ thành viên) với phân trang 1000 dòng/lượt.
 * Hỗ trợ fallback về local_dump_data.json khi chạy local offline hoặc USE_LOCAL_DUMP=true.
 */
export async function fetchFullGenealogyGraph(
  supabase: SupabaseClient,
): Promise<FullGraphResult> {
  const preferLocalDump =
    process.env.USE_LOCAL_DUMP === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (preferLocalDump) {
    const localData = loadLocalDumpData();
    if (localData) {
      return {
        persons: localData.persons,
        relationships: localData.relationships,
        totalPersonsInDatabase: localData.persons.length,
        dataSource: "local_dump",
      };
    }
  }

  try {
    const [persons, relationships] = await Promise.all([
      fetchAllPaginated<Person>((from, to) =>
        supabase
          .from("persons")
          .select(TREE_PERSON_COLUMNS)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllPaginated<Relationship>((from, to) =>
        supabase
          .from("relationships")
          .select("*")
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (persons.length > 0) {
      return {
        persons,
        relationships,
        totalPersonsInDatabase: persons.length,
        dataSource: "supabase",
      };
    }
  } catch {
    // fallback to local dump if available
  }

  const localFallback = loadLocalDumpData();
  if (localFallback) {
    return {
      persons: localFallback.persons,
      relationships: localFallback.relationships,
      totalPersonsInDatabase: localFallback.persons.length,
      dataSource: "local_dump",
    };
  }

  return {
    persons: [],
    relationships: [],
    totalPersonsInDatabase: 0,
    dataSource: "supabase",
  };
}

/**
 * Tải cây con (subtree) theo bán kính depth (mặc định 2) từ rootId.
 * Giữ lại để tương thích ngược với API /api/genealogy/subtree.
 */
export async function fetchGenealogySubtree(
  supabase: SupabaseClient,
  rootId: string,
  depth = 2,
): Promise<SubtreeResult> {
  const collectedPersons = new Map<string, Person>();
  const collectedRelationships = new Map<string, Relationship>();

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

import { getSupabase } from "@/utils/supabase/queries";

// Fetch all parent IDs for a given person using the relationships table
// type = "biological_child": person_a is parent, person_b is child
async function getParentId(personId: string): Promise<string | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("relationships")
    .select("person_a")
    .eq("person_b", personId)
    .in("type", ["biological_child", "adopted_child"])
    .limit(1)
    .single();

  return (data as { person_a: string } | null)?.person_a ?? null;
}

async function getPersonName(personId: string): Promise<string> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("persons")
    .select("full_name")
    .eq("id", personId)
    .single();
  return (data as { full_name: string } | null)?.full_name ?? personId;
}

// Build ancestor chain for a person (walks parent chain up to root)
async function getAncestorChain(personId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = personId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    chain.push(currentId);
    currentId = await getParentId(currentId);
  }

  return chain; // chain[0] = person, chain[N] = oldest ancestor reached
}

export interface KinshipResult {
  found: boolean;
  generation_diff: number;
  relationship_vi: string;
  relationship_en: string;
  path: string;
}

function getKinshipLabel(diff: number, subjectIsDescendant: boolean): { vi: string; en: string } {
  if (subjectIsDescendant) {
    switch (diff) {
      case 1: return { vi: "con", en: "child" };
      case 2: return { vi: "cháu nội/ngoại", en: "grandchild" };
      case 3: return { vi: "chắt", en: "great-grandchild" };
      case 4: return { vi: "chút", en: "great-great-grandchild" };
      default: return { vi: `hậu duệ đời thứ ${diff}`, en: `${diff}th-generation descendant` };
    }
  }
  switch (diff) {
    case 1: return { vi: "cha/mẹ", en: "parent" };
    case 2: return { vi: "ông/bà nội/ngoại", en: "grandparent" };
    case 3: return { vi: "ông/bà cố", en: "great-grandparent" };
    case 4: return { vi: "ông/bà tổ", en: "great-great-grandparent" };
    default: return { vi: `tổ tiên đời thứ ${diff}`, en: `${diff}th-generation ancestor` };
  }
}

export async function computeKinship(
  subjectId: string,
  relatedId: string
): Promise<KinshipResult | null> {
  try {
    const [subjectChain, relatedChain] = await Promise.all([
      getAncestorChain(subjectId),
      getAncestorChain(relatedId),
    ]);

    // Check if relatedId is an ancestor of subject
    const subjectToRelated = subjectChain.indexOf(relatedId);
    if (subjectToRelated > 0) {
      const diff = subjectToRelated;
      const label = getKinshipLabel(diff, true);
      // Build readable path
      const pathNames = await Promise.all(subjectChain.slice(0, diff + 1).map(getPersonName));
      return {
        found: true,
        generation_diff: diff,
        relationship_vi: label.vi,
        relationship_en: label.en,
        path: pathNames.join(" → "),
      };
    }

    // Check if subjectId is an ancestor of related
    const relatedToSubject = relatedChain.indexOf(subjectId);
    if (relatedToSubject > 0) {
      const diff = relatedToSubject;
      const label = getKinshipLabel(diff, false);
      const pathNames = await Promise.all(relatedChain.slice(0, diff + 1).map(getPersonName));
      return {
        found: true,
        generation_diff: -diff,
        relationship_vi: label.vi,
        relationship_en: label.en,
        path: pathNames.join(" → "),
      };
    }

    // Find lowest common ancestor (lateral relatives)
    const relatedAncestorSet = new Set(relatedChain);
    for (let i = 0; i < subjectChain.length; i++) {
      if (relatedAncestorSet.has(subjectChain[i])) {
        const subDist = i;
        const relDist = relatedChain.indexOf(subjectChain[i]);
        const ancName = await getPersonName(subjectChain[i]);
        const subName = await getPersonName(subjectId);
        const relName = await getPersonName(relatedId);
        return {
          found: true,
          generation_diff: 0,
          relationship_vi: `họ hàng (tổ tiên chung: ${ancName}, cách ${subDist} đời bên ${subName}, ${relDist} đời bên ${relName})`,
          relationship_en: `relatives (common ancestor: ${ancName}, ${subDist} gen from ${subName}, ${relDist} gen from ${relName})`,
          path: `${subName} → ... → ${ancName} ← ... ← ${relName}`,
        };
      }
    }

    return {
      found: false,
      generation_diff: 0,
      relationship_vi: "không có quan hệ họ hàng trực tiếp trong dữ liệu gia phả",
      relationship_en: "no direct family relationship found in the genealogy data",
      path: "",
    };
  } catch (err) {
    console.error({ err }, "kinship-resolver: traversal failed");
    return null;
  }
}

import { getSupabase } from "@/utils/supabase/queries";

interface PersonNode {
  id: string;
  full_name: string;
  generation: number | null;
  parent_id: string | null;
}

// Fetch all ancestors of a person up to the root via parent_id chain
async function getAncestorChain(personId: string): Promise<PersonNode[]> {
  const supabase = await getSupabase();
  const chain: PersonNode[] = [];
  let currentId: string | null = personId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const { data } = await supabase
      .from("persons")
      .select("id, full_name, generation, parent_id")
      .eq("id", currentId)
      .single();

    if (!data) break;
    const node = data as unknown as PersonNode;
    chain.push(node);
    currentId = node.parent_id;
  }

  return chain; // chain[0] = the person, chain[N] = oldest ancestor
}

export interface KinshipResult {
  found: boolean;
  generation_diff: number; // positive = A is descendant of B, negative = A is ancestor of B
  relationship_vi: string; // e.g. "cháu nội", "ông nội", "con"
  relationship_en: string;
  path: string; // e.g. "A → cha A → ông A (= B)"
}

// Vietnamese kinship terms by generation difference
function getVietnameseKinship(diff: number, subjectIsDescendant: boolean): { vi: string; en: string } {
  // diff = how many generations apart (always positive)
  // subjectIsDescendant = true: subject is below related_to in tree
  if (subjectIsDescendant) {
    // subject is a descendant of related_to
    switch (diff) {
      case 1: return { vi: "con", en: "child" };
      case 2: return { vi: "cháu nội/ngoại", en: "grandchild" };
      case 3: return { vi: "chắt", en: "great-grandchild" };
      case 4: return { vi: "chút", en: "great-great-grandchild" };
      default: return { vi: `hậu duệ đời thứ ${diff}`, en: `${diff}th-generation descendant` };
    }
  } else {
    // subject is an ancestor of related_to
    switch (diff) {
      case 1: return { vi: "cha/mẹ", en: "parent" };
      case 2: return { vi: "ông/bà nội/ngoại", en: "grandparent" };
      case 3: return { vi: "ông/bà cố", en: "great-grandparent" };
      case 4: return { vi: "ông/bà tổ", en: "great-great-grandparent" };
      default: return { vi: `tổ tiên đời thứ ${diff}`, en: `${diff}th-generation ancestor` };
    }
  }
}

/**
 * Compute the kinship relationship between two people by traversing parent_id chains.
 * Returns whether B is an ancestor/descendant of A and their relationship label.
 */
export async function computeKinship(
  subjectId: string,
  relatedId: string
): Promise<KinshipResult | null> {
  // Get ancestor chains for both
  const [subjectChain, relatedChain] = await Promise.all([
    getAncestorChain(subjectId),
    getAncestorChain(relatedId),
  ]);

  const subjectAncestorIds = new Set(subjectChain.map((p) => p.id));
  const relatedAncestorIds = new Set(relatedChain.map((p) => p.id));

  // Check if relatedId is an ancestor of subject
  if (relatedAncestorIds.has(relatedId) && subjectChain.some((p) => p.id === relatedId)) {
    // relatedId appears in subject's ancestor chain → related_to is ancestor of subject
    const diff = subjectChain.findIndex((p) => p.id === relatedId);
    const kinship = getVietnameseKinship(diff, true); // subject is descendant
    const pathNames = subjectChain
      .slice(0, diff + 1)
      .map((p) => p.full_name)
      .join(" → ");
    return {
      found: true,
      generation_diff: diff,
      relationship_vi: kinship.vi,
      relationship_en: kinship.en,
      path: pathNames,
    };
  }

  // Check if subjectId is an ancestor of relatedId
  if (relatedChain.some((p) => p.id === subjectId)) {
    const diff = relatedChain.findIndex((p) => p.id === subjectId);
    const kinship = getVietnameseKinship(diff, false); // subject is ancestor
    const pathNames = relatedChain
      .slice(0, diff + 1)
      .map((p) => p.full_name)
      .join(" → ");
    return {
      found: true,
      generation_diff: -diff,
      relationship_vi: kinship.vi,
      relationship_en: kinship.en,
      path: pathNames,
    };
  }

  // Find lowest common ancestor
  for (const subAncestor of subjectChain) {
    if (relatedAncestorIds.has(subAncestor.id)) {
      // Found a common ancestor — they are lateral relatives (e.g. cousins)
      const subDist = subjectChain.findIndex((p) => p.id === subAncestor.id);
      const relDist = relatedChain.findIndex((p) => p.id === subAncestor.id);
      return {
        found: true,
        generation_diff: 0,
        relationship_vi: `họ hàng (tổ tiên chung: ${subAncestor.full_name}, cách ${subDist} đời bên A, ${relDist} đời bên B)`,
        relationship_en: `relatives (common ancestor: ${subAncestor.full_name}, ${subDist} generations from A, ${relDist} from B)`,
        path: `${subjectChain[0].full_name} → ... → ${subAncestor.full_name} ← ... ← ${relatedChain[0].full_name}`,
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
}

import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string }>;
}
export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { rootId } = await searchParams;

  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const supabase = await getSupabase();

  // Paginate to bypass PostgREST max-rows cap (default 1000)
  const PAGE_SIZE = 1000;

  const persons: Person[] = [];
  let pFrom = 0;
  while (true) {
    const { data } = await supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false })
      .range(pFrom, pFrom + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    persons.push(...(data as Person[]));
    if (data.length < PAGE_SIZE) break;
    pFrom += PAGE_SIZE;
  }

  const relationships: Relationship[] = [];
  let rFrom = 0;
  while (true) {
    const { data } = await supabase
      .from("relationships")
      .select("*")
      .range(rFrom, rFrom + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    relationships.push(...(data as Relationship[]));
    if (data.length < PAGE_SIZE) break;
    rFrom += PAGE_SIZE;
  }


  // Prepare map and roots for tree views
  const personsMap = new Map();
  persons.forEach((p) => personsMap.set(p.id, p));

  const childIds = new Set(
    relationships
      .filter(
        (r) => r.type === "biological_child" || r.type === "adopted_child",
      )
      .map((r) => r.person_b),
  );

  let finalRootId = rootId;

  // If no rootId is provided, fallback to the earliest non-in-law ancestor
  if (!finalRootId || !personsMap.has(finalRootId)) {
    const rootsFallback = persons.filter((p) => !childIds.has(p.id));
    // Prefer non-in-law roots (actual blood ancestors), fall back to any root
    const preferredRoot =
      rootsFallback.find((p) => !p.is_in_law) ?? rootsFallback[0];
    if (preferredRoot) {
      finalRootId = preferredRoot.id;
    } else if (persons.length > 0) {
      finalRootId = persons[0].id; // ultimate fallback
    }
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
      />

      <MemberDetailModal />
    </DashboardProvider>
  );
}

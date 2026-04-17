import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { matchesSearchQuery, normalizeForSearch } from "@/utils/textSearch";

type ViewMode = "list" | "tree" | "mindmap";
type ListFilterOption =
  | "all"
  | "male"
  | "female"
  | "in_law_female"
  | "in_law_male"
  | "deceased"
  | "first_child";
type ListSortOption =
  | "birth_asc"
  | "birth_desc"
  | "name_asc"
  | "name_desc"
  | "updated_desc"
  | "updated_asc"
  | "generation_asc"
  | "generation_desc";

const MEMBER_LIST_PAGE_SIZE = 24;
const VALID_VIEWS = new Set<ViewMode>(["list", "tree", "mindmap"]);
const VALID_FILTERS = new Set<ListFilterOption>([
  "all",
  "male",
  "female",
  "in_law_female",
  "in_law_male",
  "deceased",
  "first_child",
]);
const VALID_SORTS = new Set<ListSortOption>([
  "birth_asc",
  "birth_desc",
  "name_asc",
  "name_desc",
  "updated_desc",
  "updated_asc",
  "generation_asc",
  "generation_desc",
]);

const parseView = (value?: string): ViewMode => {
  if (value && VALID_VIEWS.has(value as ViewMode)) {
    return value as ViewMode;
  }
  return "list";
};

const parseFilter = (value?: string): ListFilterOption => {
  if (value && VALID_FILTERS.has(value as ListFilterOption)) {
    return value as ListFilterOption;
  }
  return "all";
};

const parseSort = (value?: string): ListSortOption => {
  if (value && VALID_SORTS.has(value as ListSortOption)) {
    return value as ListSortOption;
  }
  return "updated_desc";
};

const parsePage = (value?: string): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
};

const parseGeneration = (value?: string): number | null => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
};

interface PageProps {
  searchParams: Promise<{
    view?: string;
    rootId?: string;
    listSearch?: string;
    listFilter?: string;
    listSort?: string;
    listPage?: string;
    listGeneration?: string;
    listBranch?: string;
  }>;
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentView = parseView(params.view);
  const listSearch = params.listSearch?.trim() ?? "";
  const listFilter = parseFilter(params.listFilter);
  const listSort = parseSort(params.listSort);
  const listPage = parsePage(params.listPage);
  const listGeneration = parseGeneration(params.listGeneration);
  const listBranch = params.listBranch?.trim() ?? "";
  const hasListSearch = normalizeForSearch(listSearch).length > 0;

  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";
  const supabase = await getSupabase();

  let persons: Person[] = [];
  const relationships: Relationship[] = [];
  let listPersons: Person[] = [];
  let listTotal = 0;

  if (currentView === "list") {
    type SearchCandidate = Pick<
      Person,
      "id" | "full_name" | "birth_year" | "generation"
    >;

    let query = hasListSearch
      ? supabase
          .from("persons")
          .select("id, full_name, birth_year, generation")
      : supabase.from("persons").select("*", { count: "exact" });

    if (listGeneration !== null) {
      query = query.eq("generation", listGeneration);
    }
    if (listBranch.length > 0) {
      query = query.ilike("branch", `%${listBranch}%`);
    }

    switch (listFilter) {
      case "male":
        query = query.eq("gender", "male");
        break;
      case "female":
        query = query.eq("gender", "female");
        break;
      case "in_law_female":
        query = query.eq("gender", "female").eq("is_in_law", true);
        break;
      case "in_law_male":
        query = query.eq("gender", "male").eq("is_in_law", true);
        break;
      case "deceased":
        query = query.eq("is_deceased", true);
        break;
      case "first_child":
        query = query.eq("birth_order", 1);
        break;
      case "all":
      default:
        break;
    }

    switch (listSort) {
      case "birth_asc":
        query = query.order("birth_year", { ascending: true, nullsFirst: false });
        break;
      case "birth_desc":
        query = query.order("birth_year", { ascending: false, nullsFirst: false });
        break;
      case "name_asc":
        query = query.order("full_name", { ascending: true });
        break;
      case "name_desc":
        query = query.order("full_name", { ascending: false });
        break;
      case "updated_asc":
        query = query.order("updated_at", { ascending: true });
        break;
      case "generation_asc":
        query = query
          .order("generation", { ascending: true, nullsFirst: false })
          .order("birth_order", { ascending: true, nullsFirst: false });
        break;
      case "generation_desc":
        query = query
          .order("generation", { ascending: false, nullsFirst: false })
          .order("birth_order", { ascending: false, nullsFirst: false });
        break;
      case "updated_desc":
      default:
        query = query.order("updated_at", { ascending: false });
        break;
    }
    query = query.order("id", { ascending: true });

    const rangeFrom = (listPage - 1) * MEMBER_LIST_PAGE_SIZE;
    const rangeTo = rangeFrom + MEMBER_LIST_PAGE_SIZE - 1;

    if (hasListSearch) {
      const SEARCH_PAGE_SIZE = 1000;
      const searchCandidates: SearchCandidate[] = [];
      let searchFrom = 0;

      while (true) {
        const { data } = await query.range(
          searchFrom,
          searchFrom + SEARCH_PAGE_SIZE - 1,
        );
        if (!data || data.length === 0) break;
        searchCandidates.push(...(data as SearchCandidate[]));
        if (data.length < SEARCH_PAGE_SIZE) break;
        searchFrom += SEARCH_PAGE_SIZE;
      }

      const seenIds = new Set<string>();
      const searchedIds: string[] = [];
      for (const person of searchCandidates) {
        if (seenIds.has(person.id)) continue;
        seenIds.add(person.id);

        if (
          matchesSearchQuery(
            [person.full_name, person.birth_year, person.generation],
            listSearch,
          )
        ) {
          searchedIds.push(person.id);
        }
      }

      listTotal = searchedIds.length;
      const pageIds = searchedIds.slice(rangeFrom, rangeTo + 1);

      if (pageIds.length === 0) {
        listPersons = [];
      } else {
        const { data: pageData } = await supabase
          .from("persons")
          .select("*")
          .in("id", pageIds);

        const pageMap = new Map(
          ((pageData as Person[]) ?? []).map((person) => [person.id, person]),
        );
        listPersons = pageIds
          .map((id) => pageMap.get(id))
          .filter((person): person is Person => person !== undefined);
      }
    } else {
      const { data, count } = await query.range(rangeFrom, rangeTo);
      listPersons = (data as Person[]) ?? [];
      listTotal = count ?? 0;
    }
  } else {
    // Paginate to bypass PostgREST max-rows cap (default 1000)
    const PAGE_SIZE = 1000;

    const personsRaw: Person[] = [];
    let pFrom = 0;
    while (true) {
      const { data } = await supabase
        .from("persons")
        .select("*")
        .order("birth_year", { ascending: true, nullsFirst: false })
        .range(pFrom, pFrom + PAGE_SIZE - 1);
      if (!data || data.length === 0) break;
      personsRaw.push(...(data as Person[]));
      if (data.length < PAGE_SIZE) break;
      pFrom += PAGE_SIZE;
    }

    // Deduplicate by id to guard against any paginated overlap.
    const seenIds = new Set<string>();
    persons = personsRaw.filter((person) => {
      if (seenIds.has(person.id)) return false;
      seenIds.add(person.id);
      return true;
    });

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
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
        listPersons={listPersons}
        listQueryState={{
          searchTerm: listSearch,
          filterOption: listFilter,
          sortOption: listSort,
          generationFilter: listGeneration ? String(listGeneration) : "",
          branchFilter: listBranch,
          page: listPage,
          pageSize: MEMBER_LIST_PAGE_SIZE,
          total: listTotal,
        }}
      />

      <MemberDetailModal />
    </DashboardProvider>
  );
}


import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import {
  matchesSearchQuery,
  normalizeForSearch,
  tokenizeForSearch,
} from "@/utils/textSearch";

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
    const searchTokens = hasListSearch ? tokenizeForSearch(listSearch) : [];
    const rangeFrom = (listPage - 1) * MEMBER_LIST_PAGE_SIZE;
    const rangeTo = rangeFrom + MEMBER_LIST_PAGE_SIZE - 1;

    // Single source of truth for the list query (structured filters + sort).
    // `withSearch` adds the server-side, trigram-indexed name match on the
    // normalized `name_search` column (docs/members-search-migration.sql),
    // replacing the old fetch-all-then-filter-in-JS scan.
    const buildListQuery = (withSearch: boolean) => {
      let query = supabase.from("persons").select("*", { count: "exact" });

      if (withSearch) {
        for (const token of searchTokens) {
          query = query.ilike("name_search", `%${token}%`);
        }
      }

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

      return query.order("id", { ascending: true });
    };

    if (!hasListSearch) {
      const { data, count } = await buildListQuery(false).range(
        rangeFrom,
        rangeTo,
      );
      listPersons = (data as Person[]) ?? [];
      listTotal = count ?? 0;
    } else {
      // Fast path: server-side name match + pagination in one round-trip.
      const { data, count, error } = await buildListQuery(true).range(
        rangeFrom,
        rangeTo,
      );

      if (!error) {
        listPersons = (data as Person[]) ?? [];
        listTotal = count ?? 0;
      } else {
        // Fallback when `name_search` is missing (migration not applied yet):
        // structured-filtered scan + JS name filter. Delete once migration live.
        const SEARCH_PAGE_SIZE = 1000;
        const seenIds = new Set<string>();
        const matched: Person[] = [];
        let searchFrom = 0;

        while (true) {
          const { data: pageData } = await buildListQuery(false).range(
            searchFrom,
            searchFrom + SEARCH_PAGE_SIZE - 1,
          );
          const chunk = (pageData as Person[]) ?? [];
          if (chunk.length === 0) break;
          for (const person of chunk) {
            if (seenIds.has(person.id)) continue;
            seenIds.add(person.id);
            if (
              matchesSearchQuery(
                [person.full_name, person.birth_year, person.generation],
                listSearch,
              )
            ) {
              matched.push(person);
            }
          }
          if (chunk.length < SEARCH_PAGE_SIZE) break;
          searchFrom += SEARCH_PAGE_SIZE;
        }

        listTotal = matched.length;
        listPersons = matched.slice(rangeFrom, rangeTo + 1);
      }
    }
  } else {
    // Tree/mindmap view needs the full graph (root picker, ancestor walking,
    // adjacency). Fetch all persons + relationships, but fan the paged requests
    // out in PARALLEL instead of sequentially. Measured on ~4k rows this cut the
    // data fetch from ~1.7s to ~0.6s (see scripts/bench-members.mjs).
    const PAGE_SIZE = 1000;

    const [{ count: personCount }, { count: relCount }] = await Promise.all([
      supabase.from("persons").select("id", { count: "exact", head: true }),
      supabase.from("relationships").select("id", { count: "exact", head: true }),
    ]);

    const personPages = Math.ceil((personCount ?? 0) / PAGE_SIZE);
    const relPages = Math.ceil((relCount ?? 0) / PAGE_SIZE);

    // Stable total order (birth_year + id / id) keeps the parallel page ranges
    // disjoint and deterministic.
    const [personResults, relResults] = await Promise.all([
      Promise.all(
        Array.from({ length: personPages }, (_, i) =>
          supabase
            .from("persons")
            .select("*")
            .order("birth_year", { ascending: true, nullsFirst: false })
            .order("id", { ascending: true })
            .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1),
        ),
      ),
      Promise.all(
        Array.from({ length: relPages }, (_, i) =>
          supabase
            .from("relationships")
            .select("*")
            .order("id", { ascending: true })
            .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1),
        ),
      ),
    ]);

    const personsRaw: Person[] = [];
    for (const { data } of personResults) {
      if (data) personsRaw.push(...(data as Person[]));
    }

    // Deduplicate by id to guard against any paginated overlap.
    const seenIds = new Set<string>();
    persons = personsRaw.filter((person) => {
      if (seenIds.has(person.id)) return false;
      seenIds.add(person.id);
      return true;
    });

    for (const { data } of relResults) {
      if (data) relationships.push(...(data as Relationship[]));
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


import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle from "@/components/ViewToggle";
import { Person, Relationship } from "@/types";
import {
  fetchFullGenealogyGraph,
  LIST_PERSON_COLUMNS,
  loadLocalDumpData,
} from "@/utils/genealogyService";
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
  let totalPersonsInDatabase = 0;
  let dataSource: "supabase" | "local_dump" = "supabase";

  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (currentView === "list") {
    if (!hasSupabaseEnv || process.env.USE_LOCAL_DUMP === "true") {
      const localData = loadLocalDumpData();
      if (localData) {
        dataSource = "local_dump";
        totalPersonsInDatabase = localData.persons.length;
        const filtered = localData.persons.filter((p) => {
          if (hasListSearch) {
            if (
              !matchesSearchQuery(
                [p.full_name, p.birth_year, p.generation],
                listSearch,
              )
            ) {
              return false;
            }
          }
          if (listGeneration !== null && p.generation !== listGeneration) return false;
          if (listBranch.length > 0 && !(p.branch ?? "").toLowerCase().includes(listBranch.toLowerCase())) return false;
          if (listFilter === "male" && p.gender !== "male") return false;
          if (listFilter === "female" && p.gender !== "female") return false;
          if (listFilter === "in_law_female" && !(p.gender === "female" && p.is_in_law)) return false;
          if (listFilter === "in_law_male" && !(p.gender === "male" && p.is_in_law)) return false;
          if (listFilter === "deceased" && !p.is_deceased) return false;
          if (listFilter === "first_child" && p.birth_order !== 1) return false;
          return true;
        });
        listTotal = filtered.length;
        const rangeFrom = (listPage - 1) * MEMBER_LIST_PAGE_SIZE;
        listPersons = filtered.slice(rangeFrom, rangeFrom + MEMBER_LIST_PAGE_SIZE);
      }
    } else {
    const searchTokens = hasListSearch ? tokenizeForSearch(listSearch) : [];
    const rangeFrom = (listPage - 1) * MEMBER_LIST_PAGE_SIZE;
    const rangeTo = rangeFrom + MEMBER_LIST_PAGE_SIZE - 1;

    // Single source of truth for the list query (structured filters + sort).
    // Tối ưu P0.1: Chỉ SELECT các cột tối thiểu hiển thị trên card (LIST_PERSON_COLUMNS),
    // loại bỏ hoàn toàn các trường nặng như note (tiểu sử dài HTML), address, phone...
    const buildListQuery = (withSearch: boolean) => {
      let query = supabase
        .from("persons")
        .select(LIST_PERSON_COLUMNS, { count: "exact" });

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
        // structured-filtered scan + JS name filter.
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
    }
  } else {
    // Mặc định kéo toàn bộ đồ thị gia phả (~4.000+ thành viên) để người dùng xem đầy đủ ngay khi vào trang
    const fullGraph = await fetchFullGenealogyGraph(supabase);
    persons = fullGraph.persons;
    relationships.push(...fullGraph.relationships);
    totalPersonsInDatabase = fullGraph.totalPersonsInDatabase;
    dataSource = fullGraph.dataSource;
  }

  return (
    <DashboardProvider>
      <ViewToggle />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
        totalPersonsInDatabase={totalPersonsInDatabase || persons.length}
        dataSource={dataSource}
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


import { Person } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { matchesSearchQuery, normalizeForSearch } from "@/utils/textSearch";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SCAN_PAGE_SIZE = 1000;
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const FEATURED_ROOT_IDS = [
  "0911c310-31cd-43c2-a705-67770bd074df",
  "c8ff761c-4a1d-47ac-9df8-43e27c3c7d0d",
  "ca91c50e-cb44-47a5-adda-9be76dc7ff9f",
  "935408e0-42e6-4a1b-a0f6-7025529e93b5",
  "1442c6b5-ca05-409f-b532-3585fbb2110f",
] as const;

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
};

type SearchCandidate = Pick<Person, "id" | "full_name" | "birth_year" | "generation">;

export async function GET(request: NextRequest) {
  const traceId = randomUUID();

  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const normalizedQuery = normalizeForSearch(query);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Bạn chưa đăng nhập.",
          traceId,
        },
        { status: 401 },
      );
    }

    if (!normalizedQuery) {
      const { data: featuredData, error: featuredError } = await supabase
        .from("persons")
        .select("*")
        .in("id", [...FEATURED_ROOT_IDS]);

      if (featuredError) {
        return NextResponse.json(
          {
            error: "Không tải được danh sách thành viên.",
            traceId,
          },
          { status: 500 },
        );
      }

      const featuredById = new Map(
        ((featuredData as Person[]) ?? []).map((person) => [person.id, person]),
      );
      const orderedFeatured = FEATURED_ROOT_IDS
        .map((id) => featuredById.get(id))
        .filter((person): person is Person => person !== undefined);

      if (orderedFeatured.length >= limit) {
        return NextResponse.json({
          ok: true,
          persons: orderedFeatured.slice(0, limit),
          traceId,
        });
      }

      const remainingLimit = limit - orderedFeatured.length;
      const notInFilter = `(${FEATURED_ROOT_IDS.map((id) => `"${id}"`).join(",")})`;
      const { data: remainingData, error: remainingError } = await supabase
        .from("persons")
        .select("*")
        .order("birth_year", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .not("id", "in", notInFilter)
        .limit(remainingLimit);

      if (remainingError) {
        return NextResponse.json(
          {
            error: "Không tải được danh sách thành viên.",
            traceId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        persons: [...orderedFeatured, ...((remainingData as Person[]) ?? [])],
        traceId,
      });
    }

    const matchedIds: string[] = [];
    let from = 0;

    while (matchedIds.length < limit) {
      const { data, error } = await supabase
        .from("persons")
        .select("id, full_name, birth_year, generation")
        .order("birth_year", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .range(from, from + SCAN_PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json(
          {
            error: "Không tìm được thành viên theo từ khóa.",
            traceId,
          },
          { status: 500 },
        );
      }

      const chunk = (data as SearchCandidate[]) ?? [];
      if (chunk.length === 0) {
        break;
      }

      for (const candidate of chunk) {
        if (
          matchesSearchQuery(
            [candidate.full_name, candidate.birth_year, candidate.generation],
            query,
          )
        ) {
          matchedIds.push(candidate.id);
          if (matchedIds.length >= limit) {
            break;
          }
        }
      }

      if (chunk.length < SCAN_PAGE_SIZE) {
        break;
      }

      from += SCAN_PAGE_SIZE;
    }

    if (matchedIds.length === 0) {
      return NextResponse.json({
        ok: true,
        persons: [],
        traceId,
      });
    }

    const { data: matchedPersons, error: matchedPersonsError } = await supabase
      .from("persons")
      .select("*")
      .in("id", matchedIds);

    if (matchedPersonsError) {
      return NextResponse.json(
        {
          error: "Không tải được kết quả tìm kiếm.",
          traceId,
        },
        { status: 500 },
      );
    }

    const personById = new Map(
      ((matchedPersons as Person[]) ?? []).map((person) => [person.id, person]),
    );

    const orderedPersons = matchedIds
      .map((id) => personById.get(id))
      .filter((person): person is Person => person !== undefined);

    return NextResponse.json({
      ok: true,
      persons: orderedPersons,
      traceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tìm kiếm thành viên.",
        traceId,
      },
      { status: 500 },
    );
  }
}

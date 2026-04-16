import KinshipFinder from "@/components/KinshipFinder";
import { getSupabase } from "@/utils/supabase/queries";

export const metadata = {
  title: "Tra cứu danh xưng",
};

export default async function KinshipPage() {
  const supabase = await getSupabase();

  const personSelect =
    "id, full_name, gender, birth_year, birth_order, generation, is_in_law, avatar_url";
  const pageSize = 1000;
  const persons: Array<{
    id: string;
    full_name: string;
    gender: "male" | "female" | "other";
    birth_year: number | null;
    birth_order: number | null;
    generation: number | null;
    is_in_law: boolean;
    avatar_url: string | null;
  }> = [];
  let from = 0;

  while (true) {
    const { data: chunk, error } = await supabase
      .from("persons")
      .select(personSelect)
      .order("birth_year", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error || !chunk || chunk.length === 0) break;
    persons.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  const relationships: Array<{
    type: string;
    person_a: string;
    person_b: string;
  }> = [];
  let relFrom = 0;

  while (true) {
    const { data: relChunk, error } = await supabase
      .from("relationships")
      .select("id, type, person_a, person_b")
      .order("id", { ascending: true })
      .range(relFrom, relFrom + pageSize - 1);

    if (error || !relChunk || relChunk.length === 0) break;

    relationships.push(
      ...relChunk.map((r) => ({
        type: r.type,
        person_a: r.person_a,
        person_b: r.person_b,
      })),
    );

    if (relChunk.length < pageSize) break;
    relFrom += pageSize;
  }

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="title">Tra cứu danh xưng</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn hai thành viên để tự động tính cách gọi theo quan hệ gia phả
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <KinshipFinder
          persons={persons}
          relationships={relationships}
        />
      </main>
    </div>
  );
}

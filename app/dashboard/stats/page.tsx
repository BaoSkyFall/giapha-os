import FamilyStats from "@/components/FamilyStats";
import { Person, Relationship } from "@/types";
import { getSupabase } from "@/utils/supabase/queries";

export const metadata = {
  title: "Thống kê gia phả",
};

export default async function StatsPage() {
  const supabase = await getSupabase();
  const pageSize = 1000;

  const persons: Person[] = [];
  let personFrom = 0;

  while (true) {
    const { data: personChunk, error } = await supabase
      .from("persons")
      .select("*")
      .order("id", { ascending: true })
      .range(personFrom, personFrom + pageSize - 1);

    if (error || !personChunk || personChunk.length === 0) break;
    persons.push(...personChunk);

    if (personChunk.length < pageSize) break;
    personFrom += pageSize;
  }

  const relationships: Relationship[] = [];
  let relationshipFrom = 0;

  while (true) {
    const { data: relationshipChunk, error } = await supabase
      .from("relationships")
      .select("*")
      .order("id", { ascending: true })
      .range(relationshipFrom, relationshipFrom + pageSize - 1);

    if (error || !relationshipChunk || relationshipChunk.length === 0) break;
    relationships.push(...relationshipChunk);

    if (relationshipChunk.length < pageSize) break;
    relationshipFrom += pageSize;
  }

  return (
    <div className="flex-1 w-full relative flex flex-col pb-12">
      <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <h1 className="title">Thống kê gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats
          persons={persons}
          relationships={relationships}
        />
      </main>
    </div>
  );
}

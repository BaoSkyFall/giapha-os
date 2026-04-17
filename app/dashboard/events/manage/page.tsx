import AdminEventsManager from "@/components/AdminEventsManager";
import { CustomEventRecord } from "@/utils/eventHelpers";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Quản lý sự kiện",
};

export default async function ManageEventsPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard/events");
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by, status")
    .order("event_date", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching custom events:", error);
  }

  const initialEvents = (data as CustomEventRecord[]) ?? [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="title">Quản lý sự kiện</h1>
          <p className="text-stone-500 text-sm sm:text-base">
            Quản lý sự kiện tùy chỉnh của dòng họ: tìm kiếm, thêm mới, chỉnh sửa
            và xóa.
          </p>
        </div>

        <AdminEventsManager initialEvents={initialEvents} />
      </div>
    </main>
  );
}

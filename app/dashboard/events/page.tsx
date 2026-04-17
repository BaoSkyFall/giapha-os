import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/MemberDetailModal";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import Link from "next/link";

export const metadata = {
  title: "Sự kiện gia phả",
};

export default async function EventsPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  const supabase = await getSupabase();

  const { data: customEvents } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by, status")
    .eq("status", "published");

  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Danh sách sự kiện tùy chỉnh đã được published.
          </p>
          {isAdmin ? (
            <div className="mt-3">
              <Link
                href="/dashboard/events/manage"
                className="inline-flex items-center rounded-lg border border-heritage-gold/30 bg-white px-3 py-1.5 text-xs font-semibold text-heritage-red transition-colors hover:bg-rice-paper"
              >
                Quản lý sự kiện
              </Link>
            </div>
          ) : null}
        </div>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <EventsList
            persons={[]}
            customEvents={customEvents ?? []}
            allowCustomEventManagement={false}
          />
        </main>
      </div>

      <MemberDetailModal />
    </DashboardProvider>
  );
}

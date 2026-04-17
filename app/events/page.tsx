import config from "@/app/config";
import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MemberDetailModal from "@/components/MemberDetailModal";
import { UserProvider } from "@/components/UserProvider";
import { createAdminClient } from "@/utils/supabase/admin";

export const metadata = {
  title: "Sự kiện gia phả",
};

export default async function PublicEventsPage() {
  const supabase = createAdminClient();

  const [personsRes, customEventsRes] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased, avatar_url",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by, status")
      .eq("status", "published"),
  ]);

  const persons = personsRes.data || [];
  const customEvents = customEventsRes.data || [];

  return (
    <div className="min-h-screen bg-rice-paper flex flex-col">
      <Header siteName={config.siteName} />

      <UserProvider user={null} profile={null}>
        <DashboardProvider>
          <div className="flex-1 w-full relative flex flex-col pb-12">
            <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
              <h1 className="title">Sự kiện gia phả</h1>
              <p className="text-stone-500 mt-1 text-sm">
                Ngày giỗ (âm lịch) và các sự kiện chung của dòng họ.
              </p>
            </div>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
              <EventsList
                persons={persons ?? []}
                customEvents={customEvents ?? []}
                allowCustomEventManagement={false}
              />
            </main>
          </div>

          <MemberDetailModal />
        </DashboardProvider>
      </UserProvider>

      <Footer />
    </div>
  );
}

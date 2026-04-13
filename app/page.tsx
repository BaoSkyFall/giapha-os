import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import { computeEvents } from "@/utils/eventHelpers";
import { createAdminClient } from "@/utils/supabase/admin";
import config from "./config";

const LANDING_EVENT_LIMIT = 5;

export default async function HomePage() {
  const supabase = createAdminClient();

  const [personsRes, customEventsRes] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by"),
  ]);

  const persons = personsRes.data ?? [];
  const customEvents = customEventsRes.data ?? [];
  const upcomingEvents = computeEvents(persons, customEvents)
    .filter((event) => event.daysUntil >= 0)
    .slice(0, LANDING_EVENT_LIMIT)
    .map(({ nextOccurrence, ...rest }) => ({
      ...rest,
      nextOccurrence: nextOccurrence.toISOString(),
    }));

  return (
    <div className="min-h-screen bg-rice-paper flex flex-col selection:bg-heritage-gold/30 selection:text-heritage-red relative overflow-hidden">
      <Header siteName={config.siteName} />

      <main className="flex-1 flex flex-col w-full">
        <LandingHero events={upcomingEvents} />
      </main>

      <Footer />
    </div>
  );
}

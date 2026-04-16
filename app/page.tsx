import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import { computeEvents } from "@/utils/eventHelpers";
import { createAdminClient } from "@/utils/supabase/admin";
import config from "./config";

const LANDING_EVENT_LIMIT = 5;
const LANDING_HIGHLIGHT_POST_LIMIT = 4;
const LANDING_MIN_FEATURED_TARGET = 3;

interface LandingHighlightPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  published_at: string | null;
}

function selectLandingHighlightPosts(posts: LandingHighlightPostRow[]) {
  const featuredPosts = posts.filter((post) => post.is_featured);

  if (featuredPosts.length >= LANDING_MIN_FEATURED_TARGET) {
    return featuredPosts.slice(0, LANDING_HIGHLIGHT_POST_LIMIT);
  }

  const nonFeaturedPosts = posts.filter((post) => !post.is_featured);
  return [...featuredPosts, ...nonFeaturedPosts].slice(
    0,
    LANDING_HIGHLIGHT_POST_LIMIT,
  );
}

export default async function HomePage() {
  const supabase = createAdminClient();

  const [personsRes, customEventsRes, blogPostsRes] = await Promise.all([
    supabase
      .from("persons")
      .select(
        "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by"),
    supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_image_url, is_featured, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  const persons = personsRes.data ?? [];
  const customEvents = customEventsRes.data ?? [];
  const publishedPosts = (blogPostsRes.data ?? []) as LandingHighlightPostRow[];
  const highlightedPosts = selectLandingHighlightPosts(publishedPosts).map(
    (post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImageUrl: post.cover_image_url,
      publishedAt: post.published_at,
      isFeatured: post.is_featured,
    }),
  );
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
        <LandingHero events={upcomingEvents} highlightedPosts={highlightedPosts} />
      </main>

      <Footer />
    </div>
  );
}

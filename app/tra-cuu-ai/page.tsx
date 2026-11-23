import { getSupabase, getUser } from "@/utils/supabase/queries";
import TraCuuAiClient from "./TraCuuAiClient";

interface SupabaseSessionMeta {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch Supabase sessions server-side for logged-in users. Anonymous or offline → empty array. */
export default async function TraCuuAiPage() {
  let isAuthenticated = false;
  let supabaseSessions: SupabaseSessionMeta[] = [];

  try {
    const user = await getUser();
    isAuthenticated = !!user;

    if (user) {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("chat_sessions")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      supabaseSessions = data ?? [];
    }
  } catch {
    // Allow offline / missing Supabase env fallback gracefully
    isAuthenticated = false;
    supabaseSessions = [];
  }

  return (
    <TraCuuAiClient
      isAuthenticated={isAuthenticated}
      supabaseSessions={supabaseSessions}
    />
  );
}

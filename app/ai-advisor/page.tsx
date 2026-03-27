import { getSupabase, getUser } from "@/utils/supabase/queries";
import AiAdvisorClient from "./AiAdvisorClient";

interface SupabaseSessionMeta {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch Supabase sessions server-side for logged-in users. Anonymous → empty array. */
export default async function AiAdvisorPage() {
  const user = await getUser();
  const isAuthenticated = !!user;

  let supabaseSessions: SupabaseSessionMeta[] = [];
  if (isAuthenticated) {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    supabaseSessions = data ?? [];
  }

  return (
    <AiAdvisorClient
      isAuthenticated={isAuthenticated}
      supabaseSessions={supabaseSessions}
    />
  );
}

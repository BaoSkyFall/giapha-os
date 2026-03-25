import { getSupabase, getUser } from "@/utils/supabase/queries";
import AiAdvisorClient from "./AiAdvisorClient";

export default async function AiAdvisorPage() {
  const user = await getUser();
  const supabase = await getSupabase();

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return <AiAdvisorClient initialSessions={sessions ?? []} />;
}

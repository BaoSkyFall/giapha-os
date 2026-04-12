import CompleteProfileClient from "@/app/complete-profile/CompleteProfileClient";
import {
  buildBranchOptions,
  buildGenerationOptions,
} from "@/utils/auth/profile";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type PersonOption = {
  branch: string | null;
  generation: number | null;
};

export default async function CompleteProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role,full_name,birth_year,birth_month,birth_day,branch,generation,address",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    redirect("/dashboard");
  }

  const { data: persons } = await supabase
    .from("persons")
    .select("branch,generation")
    .limit(3000);

  const options = (persons || []) as PersonOption[];
  const branchOptions = buildBranchOptions(options.map((item) => item.branch));
  const generationOptions = buildGenerationOptions(
    options.map((item) => item.generation),
  );

  return (
    <div className="min-h-screen bg-rice-paper px-4 py-12 md:px-6">
      <CompleteProfileClient
        branchOptions={branchOptions}
        generationOptions={generationOptions}
        initialProfile={{
          fullName: profile?.full_name || "",
          birthYear: profile?.birth_year || null,
          birthMonth: profile?.birth_month || null,
          birthDay: profile?.birth_day || null,
          branch: profile?.branch || "",
          generation: profile?.generation || null,
          address: profile?.address || "",
        }}
      />
    </div>
  );
}

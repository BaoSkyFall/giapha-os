import AdminUserList from "@/components/AdminUserList";
import { AdminUserData } from "@/types";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  // Fetch users via RPC
  const { data: users, error } = await supabase.rpc("get_admin_users");

  if (error) {
    console.error("Error fetching users:", error);
  }

  const typedUsers = (users as AdminUserData[]) || [];
  const userIds = typedUsers.map((user) => user.id);

  const { data: userProfiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; full_name: string | null; phone_number: string | null }> };

  const profileMap = new Map(
    (userProfiles ?? []).map((profile) => [profile.id, profile]),
  );

  const mergedUsers: AdminUserData[] = typedUsers.map((user) => {
    const profileData = profileMap.get(user.id);
    return {
      ...user,
      full_name: profileData?.full_name ?? null,
      phone_number: profileData?.phone_number ?? null,
    };
  });

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-300/20 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="title">Quản lý Người dùng</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Danh sách các tài khoản đang tham gia vào hệ thống.
            </p>
          </div>
        </div>
        <AdminUserList initialUsers={mergedUsers} currentUserId={profile.id} />
      </div>
    </main>
  );
}

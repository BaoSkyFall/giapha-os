import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isMemberProfileComplete } from "@/utils/auth/profile";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  // If env vars are missing, we cannot create a supabase client
  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname !== "/missing-db-config") {
      const url = request.nextUrl.clone();
      url.pathname = "/missing-db-config";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-browser cookies across mobile browsers.
  // https://supabase.com/docs/guides/auth/server-side/nextjs

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ["/dashboard"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  const isLoginPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/admin-login");
  const isCompleteProfilePage =
    request.nextUrl.pathname.startsWith("/complete-profile");

  // Check if DB schema is initialized by checking if profiles table exists
  if (isProtectedPath || isLoginPage || isCompleteProfilePage) {
    const { error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (
      profileError &&
      (profileError.code === "PGRST205" || profileError.code === "42P01")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  if ((isProtectedPath || isCompleteProfilePage) && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((isProtectedPath || isCompleteProfilePage || isLoginPage) && user) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (currentProfile && currentProfile.role !== "admin") {
      const expiresAt = currentProfile.phone_auth_expires_at
        ? new Date(currentProfile.phone_auth_expires_at).getTime()
        : null;

      const isOtpSessionExpired =
        !expiresAt || Number.isNaN(expiresAt) || expiresAt <= Date.now();

      if (isOtpSessionExpired) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set(
          currentProfile.phone_auth_expires_at ? "expired" : "otp_required",
          "1",
        );
        return NextResponse.redirect(url);
      }

      const missingProfileInfo = !isMemberProfileComplete(currentProfile);

      if (missingProfileInfo && isProtectedPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/complete-profile";
        return NextResponse.redirect(url);
      }

      if (!missingProfileInfo && isCompleteProfilePage) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }

      if (missingProfileInfo && isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/complete-profile";
        return NextResponse.redirect(url);
      }
    }

    if (currentProfile && currentProfile.role === "admin" && isCompleteProfilePage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Redirect users who are already logged in away from the login page
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

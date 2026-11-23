import { createServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  if (!supabaseUrl || !supabaseKey) {
    // Chainable no-op query builder to avoid crashing SSR/routes when Supabase env is absent
    const emptyResult = { data: null, error: null, count: 0 };
    const createChain = (): Record<string, unknown> => {
      const chain: Record<string, unknown> = {
        then: (resolve: (val: typeof emptyResult) => void) => Promise.resolve(emptyResult).then(resolve),
      };
      for (const method of ["select", "eq", "neq", "ilike", "in", "or", "not", "is", "gt", "lt", "gte", "lte", "order", "range", "limit", "single", "maybeSingle", "insert", "update", "upsert", "delete"]) {
        chain[method] = () => (method === "single" || method === "maybeSingle" ? Promise.resolve(emptyResult) : createChain());
      }
      return chain;
    };
    return {
      from: () => createChain(),
      rpc: async () => emptyResult,
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    } as unknown as SupabaseClient;
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};

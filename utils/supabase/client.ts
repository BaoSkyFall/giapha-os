import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // Safe chainable browser fallback when Supabase env is absent
    const configErr = new Error("Missing Supabase configuration");
    const errResult = { data: null, error: configErr, count: 0 };
    const createChain = (): Record<string, unknown> => {
      const chain: Record<string, unknown> = {
        then: (resolve: (val: typeof errResult) => void) => Promise.resolve(errResult).then(resolve),
      };
      for (const method of ["select", "eq", "neq", "ilike", "in", "or", "not", "order", "range", "limit", "single", "maybeSingle", "insert", "update", "upsert", "delete"]) {
        chain[method] = () => (method === "single" || method === "maybeSingle" ? Promise.resolve(errResult) : createChain());
      }
      return chain;
    };
    return {
      from: () => createChain(),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: configErr }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        setSession: async () => ({ data: { session: null, user: null }, error: configErr }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        resetPasswordForEmail: async () => ({ data: null, error: configErr }),
        signInWithPassword: async () => ({ data: null, error: configErr }),
        signUp: async () => ({ data: null, error: configErr }),
      },
    } as unknown as SupabaseClient;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};

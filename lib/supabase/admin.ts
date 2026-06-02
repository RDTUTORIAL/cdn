import { createClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client for server-side admin operations.
 * This bypasses RLS and should ONLY be used in server-side code
 * (API routes, server components, server actions).
 *
 * Falls back gracefully if SUPABASE_SERVICE_ROLE_KEY is not set
 * (e.g., in development without Supabase configured).
 */
let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY not set. Admin operations unavailable."
    );
    return null;
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Check if Supabase admin is available.
 */
export function isSupabaseAvailable(): boolean {
  return getAdminClient() !== null;
}

// Convenience helpers with typed returns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryResult = Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>;

export const supabase = {
  from(table: string) {
    const client = getAdminClient();

    return {
      async select(_opts?: Record<string, unknown>): QueryResult {
        if (!client) return { data: null, error: new Error("Supabase not configured") };
        try {
          const query = client.from(table).select("*");
          if (_opts?.match) {
            for (const [k, v] of Object.entries(_opts.match)) {
              query.eq(k, v);
            }
          }
          if (_opts?.order) {
            const ord = _opts.order as { column: string; ascending?: boolean };
            query.order(ord.column, { ascending: ord.ascending ?? false });
          }
          if (_opts?.limit) query.limit(_opts.limit as number);
          const { data, error } = await query;
          return { data: data as Record<string, unknown>[] | null, error: error as Error | null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },

      async insert(
        data: Record<string, unknown> | Record<string, unknown>[],
        _select?: string
      ): QueryResult {
        if (!client) return { data: null, error: new Error("Supabase not configured") };
        try {
          const rows = Array.isArray(data) ? data : [data];
          const query = client.from(table).insert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows as any
          );
          const { data: result, error } = await query.select();
          return { data: result as Record<string, unknown>[] | null, error: error as Error | null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },

      async update(
        data: Record<string, unknown>,
        match: Record<string, unknown>,
        _select?: string
      ): QueryResult {
        if (!client) return { data: null, error: new Error("Supabase not configured") };
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query: any = (client.from(table) as any).update(data);
          for (const [k, v] of Object.entries(match)) {
            query = query.eq(k, v);
          }
          const { data: result, error } = await query.select();
          return { data: result as Record<string, unknown>[] | null, error: error as Error | null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },

      async delete(match: Record<string, unknown>): QueryResult {
        if (!client) return { data: null, error: new Error("Supabase not configured") };
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query: any = client.from(table).delete();
          for (const [k, v] of Object.entries(match)) {
            query = query.eq(k, v);
          }
          const { data, error } = await query;
          return { data: data as Record<string, unknown>[] | null, error: error as Error | null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },

      async upsert(
        rows: Record<string, unknown>[],
        _opts?: Record<string, unknown>,
        _select?: string
      ): QueryResult {
        if (!client) return { data: null, error: new Error("Supabase not configured") };
        try {
          const query = client.from(table).upsert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows as any
          );
          const { data: result, error } = await query.select();
          return { data: result as Record<string, unknown>[] | null, error: error as Error | null };
        } catch (err) {
          return { data: null, error: err as Error };
        }
      },
    };
  },
};

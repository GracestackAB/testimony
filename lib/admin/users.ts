import "server-only";

export type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  is_moderator: boolean;
  is_org_admin: boolean;
  onboarding_completed: boolean;
  city: string | null;
  registered_at: string;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  deleted_at: string | null;
  is_anonymized: boolean;
};

const SELECT_SQL = `
  SELECT
    p.id,
    u.email,
    p.display_name,
    p.username::text AS username,
    p.is_moderator,
    p.is_org_admin,
    p.onboarding_completed,
    p.city,
    u.created_at AS registered_at,
    u.last_sign_in_at,
    p.last_active_at,
    p.deleted_at,
    p.is_anonymized
  FROM testimony.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC
  LIMIT $1
`;

/**
 * Hämtar alla registrerade användare (moderator-endast, service role).
 */
export async function listAdminUsers(limit = 500): Promise<AdminUserRow[]> {
  if (process.env.DATABASE_URL) {
    const { getPool } = await import("@/lib/db");
    const pool = getPool();
    const res = await pool.query<AdminUserRow>(SELECT_SQL, [limit]);
    return res.rows;
  }

  return listAdminUsersViaAuthApi(limit);
}

async function listAdminUsersViaAuthApi(limit: number): Promise<AdminUserRow[]> {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const svc = await createServiceClient();

  const { data: profiles, error } = await svc
    .from("profiles")
    .select(
      "id, display_name, username, is_moderator, is_org_admin, onboarding_completed, city, last_active_at, deleted_at, is_anonymized, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  type ProfileRow = {
    id: string;
    display_name: string | null;
    username: string | null;
    is_moderator: boolean;
    is_org_admin: boolean;
    onboarding_completed: boolean;
    city: string | null;
    last_active_at: string | null;
    deleted_at: string | null;
    is_anonymized: boolean;
    created_at: string;
  };

  const rows = (profiles ?? []) as ProfileRow[];

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) {
    return rows.map((p) => ({
      id: p.id,
      email: null,
      display_name: p.display_name,
      username: p.username,
      is_moderator: Boolean(p.is_moderator),
      is_org_admin: Boolean(p.is_org_admin),
      onboarding_completed: Boolean(p.onboarding_completed),
      city: p.city,
      registered_at: p.created_at,
      last_sign_in_at: null,
      last_active_at: p.last_active_at,
      deleted_at: p.deleted_at,
      is_anonymized: Boolean(p.is_anonymized),
    }));
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  const emailById = new Map<string, { email: string | null; registered_at: string; last_sign_in_at: string | null }>();
  let page = 1;
  const perPage = 200;

  while (emailById.size < limit) {
    const res = await fetch(
      `${baseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) break;
    const json = (await res.json()) as {
      users?: Array<{
        id: string;
        email?: string;
        created_at?: string;
        last_sign_in_at?: string;
      }>;
    };
    const batch = json.users ?? [];
    if (batch.length === 0) break;
    for (const u of batch) {
      emailById.set(u.id, {
        email: u.email ?? null,
        registered_at: u.created_at ?? new Date().toISOString(),
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (batch.length < perPage) break;
    page++;
  }

  return rows.map((p) => {
    const auth = emailById.get(p.id);
    return {
      id: p.id,
      email: auth?.email ?? null,
      display_name: p.display_name,
      username: p.username,
      is_moderator: Boolean(p.is_moderator),
      is_org_admin: Boolean(p.is_org_admin),
      onboarding_completed: Boolean(p.onboarding_completed),
      city: p.city,
      registered_at: auth?.registered_at ?? p.created_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      last_active_at: p.last_active_at,
      deleted_at: p.deleted_at,
      is_anonymized: Boolean(p.is_anonymized),
    };
  });
}

export async function countAdminUsers(): Promise<number> {
  if (process.env.DATABASE_URL) {
    const { getPool } = await import("@/lib/db");
    const pool = getPool();
    const res = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM testimony.profiles"
    );
    return Number(res.rows[0]?.count ?? 0);
  }
  const { createServiceClient } = await import("@/lib/supabase/server");
  const svc = await createServiceClient();
  const { count } = await svc.from("profiles").select("id", { count: "exact", head: true });
  return count ?? 0;
}

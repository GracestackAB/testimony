import { redirect, notFound } from "next/navigation";
import { requireModerator } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { OrgForm, orgPayload } from "../_form";

async function update(formData: FormData) {
  "use server";
  await requireModerator();
  const id = String(formData.get("__id"));
  const svc = await createServiceClient();
  const { error } = await svc.from("organizations").update(orgPayload(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin/verksamheter");
}

async function remove(formData: FormData) {
  "use server";
  await requireModerator();
  const id = String(formData.get("id"));
  const svc = await createServiceClient();
  await svc.from("organizations").delete().eq("id", id);
  redirect("/admin/verksamheter");
}

async function addAdmin(formData: FormData) {
  "use server";
  await requireModerator();
  const orgId = String(formData.get("org_id"));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return;

  const svc = await createServiceClient();

  // Hitta eller skapa user via admin API
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

  const findRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
  const findData = await findRes.json();
  let userId: string | null = findData.users?.[0]?.id || null;

  if (!userId) {
    // Skapa bjudning (invite) - skickar mail
    const invite = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, data: { org_id: orgId } }),
    });
    if (invite.ok) {
      const data = await invite.json();
      userId = data.id || data.user?.id;
    }
  }

  if (!userId) {
    redirect(`/admin/verksamheter/${orgId}?err=user`);
  }

  // Säkerställ profil
  await svc.from("profiles").upsert({ id: userId }, { onConflict: "id" });

  // Skapa membership
  await svc
    .from("memberships")
    .upsert({ user_id: userId, organization_id: orgId, role: "admin" }, { onConflict: "user_id,organization_id" });

  redirect(`/admin/verksamheter/${orgId}?added=1`);
}

async function removeAdmin(formData: FormData) {
  "use server";
  await requireModerator();
  const memId = String(formData.get("mem_id"));
  const orgId = String(formData.get("org_id"));
  const svc = await createServiceClient();
  await svc.from("memberships").delete().eq("id", memId);
  redirect(`/admin/verksamheter/${orgId}`);
}

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ added?: string; err?: string }>;
}) {
  const { id } = await params;
  const { added, err } = await searchParams;
  const svc = await createServiceClient();

  const { data: row } = await svc.from("organizations").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();

  // Hämta admins
  const { data: memsRaw } = await svc
    .from("memberships")
    .select("id, role, created_at, user_id")
    .eq("organization_id", id)
    .order("created_at", { ascending: false });

  // Hämta email per user (admin API)
  const mems: Array<{ id: string; role: string; email: string; created_at: string }> = [];
  if (memsRaw && memsRaw.length > 0) {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    for (const m of memsRaw) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${m.user_id}`, {
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
      });
      const u = await res.json();
      mems.push({ id: m.id, role: m.role, email: u?.email || "(okänd)", created_at: m.created_at });
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-6">Redigera verksamhet</h1>

      <section className="mb-10 bg-white rounded-xl border border-stone-200 p-6 max-w-3xl">
        <h2 className="font-serif text-xl font-semibold text-stone-900 mb-1">Admins för denna verksamhet</h2>
        <p className="text-sm text-stone-600 mb-4">
          Admins kan logga in på <span className="font-mono">/min-verksamhet</span> och redigera info + lägga till volontäruppgifter.
        </p>

        {added && (
          <div className="mb-4 p-3 bg-olive-50 border border-olive-200 rounded text-sm text-olive-900">
            Admin tillagd. Om kontot är nytt har en inbjudan skickats via mail.
          </div>
        )}
        {err === "user" && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-900">
            Kunde inte skapa/hitta användare.
          </div>
        )}

        {mems.length === 0 ? (
          <p className="text-sm text-stone-500 mb-4">Inga admins ännu.</p>
        ) : (
          <ul className="divide-y divide-stone-100 mb-4 border border-stone-200 rounded">
            {mems.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-medium text-stone-900">{m.email}</div>
                  <div className="text-xs text-stone-500">
                    Roll: {m.role} · sedan {new Date(m.created_at).toLocaleDateString("sv-SE")}
                  </div>
                </div>
                <form action={removeAdmin}>
                  <input type="hidden" name="mem_id" value={m.id} />
                  <input type="hidden" name="org_id" value={id} />
                  <button className="text-xs text-red-700 hover:text-red-900 underline">Ta bort</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addAdmin} className="flex gap-2">
          <input type="hidden" name="org_id" value={id} />
          <input
            type="email"
            name="email"
            required
            placeholder="admin@exempel.se"
            className="flex-1 p-2.5 border border-stone-300 rounded"
          />
          <button className="px-5 py-2.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 text-sm">
            Lägg till admin
          </button>
        </form>
      </section>

      <OrgForm action={update} row={row} deleteAction={remove} />
    </div>
  );
}

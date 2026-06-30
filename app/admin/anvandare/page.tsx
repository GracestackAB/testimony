import Link from "next/link";
import { requireModerator } from "@/lib/admin";
import { listAdminUsers } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function profileHref(row: { id: string; username: string | null }): string | null {
  if (row.username) return `/u/${row.username}`;
  return `/u/id/${row.id}`;
}

export default async function Page() {
  await requireModerator();
  const users = await listAdminUsers();

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">Användare</h1>
        <p className="text-stone-600 text-sm">
          {users.length} registrerade konton. Endast synligt för moderatorer.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Namn</th>
              <th className="text-left px-5 py-3">E-post</th>
              <th className="text-left px-5 py-3">Användarnamn</th>
              <th className="text-left px-5 py-3">Registrerad</th>
              <th className="text-left px-5 py-3">Senast inloggad</th>
              <th className="text-left px-5 py-3">Roller</th>
              <th className="text-left px-5 py-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-500">
                  Inga användare ännu.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const href = profileHref(u);
              const inactive = u.deleted_at || u.is_anonymized;
              return (
                <tr
                  key={u.id}
                  className={`border-t border-stone-100 hover:bg-stone-50 ${inactive ? "opacity-60" : ""}`}
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-stone-900">
                      {u.display_name || "—"}
                    </div>
                    {u.city && <div className="text-xs text-stone-500">{u.city}</div>}
                  </td>
                  <td className="px-5 py-3 text-stone-700 font-mono text-xs">{u.email || "—"}</td>
                  <td className="px-5 py-3 text-stone-600">{u.username ? `@${u.username}` : "—"}</td>
                  <td className="px-5 py-3 text-stone-600 whitespace-nowrap">{formatDate(u.registered_at)}</td>
                  <td className="px-5 py-3 text-stone-600 whitespace-nowrap">{formatDate(u.last_sign_in_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.is_moderator && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-stone-900 text-parchment">moderator</span>
                      )}
                      {u.is_org_admin && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-olive-100 text-olive-900">org-admin</span>
                      )}
                      {!u.is_moderator && !u.is_org_admin && (
                        <span className="text-stone-400 text-xs">medlem</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.deleted_at ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-900">raderad</span>
                    ) : u.is_anonymized ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-stone-200 text-stone-700">anonymiserad</span>
                    ) : u.onboarding_completed ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-olive-100 text-olive-900">aktiv</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-900">onboarding</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {href && !inactive && (
                      <Link href={href} className="text-olive-700 hover:text-olive-900 underline text-sm">
                        Profil
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

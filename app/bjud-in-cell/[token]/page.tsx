import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCellGroupInviteByToken } from "@/lib/cell-group";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cellgruppsinbjudan" };

async function accept(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/bjud-in-cell/${token}`);

  const loaded = await getCellGroupInviteByToken(token);
  if (!loaded) redirect("/?err=invalid-invite");

  const { invite: inv, group } = loaded;
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) redirect("/?err=expired-invite");
  if (inv.max_uses && inv.uses >= inv.max_uses) redirect("/?err=used-invite");

  const svc = await createServiceClient();
  await svc.from("profiles").upsert({ id: user.id }, { onConflict: "id" });

  await svc.from("cell_group_members").upsert(
    { user_id: user.id, group_id: inv.group_id, role: inv.role },
    { onConflict: "group_id,user_id" }
  );

  await svc.from("cell_group_invite_uses").insert({
    invite_id: inv.id,
    accepted_by: user.id,
  });
  await svc.from("cell_group_invites").update({ uses: inv.uses + 1 }).eq("id", inv.id);

  redirect(`/cellgrupper/${group.slug}?welcomed=1`);
}

export default async function CellInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const loaded = await getCellGroupInviteByToken(token);

  if (!loaded) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">{t.cellGroups.invalidInvite}</h1>
        <p className="text-stone-600 mb-6">
          {locale === "en"
            ? "This invite does not exist or has been removed."
            : "Denna inbjudan finns inte eller har tagits bort."}
        </p>
        <Link href="/cellgrupper" className="text-olive-700 underline">
          ← {t.cellGroups.title}
        </Link>
      </div>
    );
  }

  const { invite: inv, group } = loaded;
  const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
  const used = inv.max_uses && inv.uses >= inv.max_uses;

  if (expired || used) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-3">{t.cellGroups.expiredInvite}</h1>
        <p className="text-stone-600 mb-6">
          {locale === "en"
            ? "Ask the person who shared the link to create a new one."
            : "Be personen som delade länken att skapa en ny."}
        </p>
        <Link href="/cellgrupper" className="text-olive-700 underline">
          {t.cellGroups.title} →
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
        <div className="text-xs uppercase tracking-widest text-olive-700 mb-3">{t.cellGroups.welcome}</div>
        <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-3">{group.name}</h1>
        {group.description && <p className="text-stone-600 mb-4 text-lg">{group.description}</p>}
        {group.meeting_info && <p className="text-sm text-stone-500 mb-6">{group.meeting_info}</p>}
        <div className="text-sm text-stone-500 mb-8">
          {locale === "en" ? "You will join as" : "Du blir"}{" "}
          <strong>{inv.role === "leader" ? t.cellGroups.leader : t.cellGroups.member}</strong>
        </div>

        {user ? (
          <form action={accept}>
            <input type="hidden" name="token" value={token} />
            <button className="w-full px-6 py-3.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors">
              {t.cellGroups.acceptInvite} ({user.email})
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/login?next=/bjud-in-cell/${token}`}
              className="block text-center w-full px-6 py-3.5 rounded-full bg-stone-900 text-parchment hover:bg-stone-800 font-medium transition-colors"
            >
              {t.cellGroups.loginToAccept}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

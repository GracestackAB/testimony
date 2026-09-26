import Link from "next/link";
import { redirect } from "next/navigation";
import { cellGroupSlugFromName } from "@/lib/cell-group";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { title: t.cellGroups.createTitle };
}

export default async function NewCellGroupPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cellgrupper/nya");

  async function createGroup(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/cellgrupper/nya");

    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim() || null;
    const meetingInfo = String(formData.get("meeting_info") || "").trim() || null;

    if (!name) redirect("/cellgrupper/nya?error=missing-name");

    const svc = await createServiceClient();
    const slug = cellGroupSlugFromName(name);

    const { data: group, error } = await svc
      .from("cell_groups")
      .insert({
        slug,
        name,
        description,
        meeting_info: meetingInfo,
        created_by: user.id,
      })
      .select("id, slug")
      .single();

    if (error || !group) redirect("/cellgrupper/nya?error=create-failed");

    await svc.from("profiles").upsert({ id: user.id }, { onConflict: "id" });
    await svc.from("cell_group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "leader",
    });

    redirect(`/cellgrupper/${group.slug}?created=1`);
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12">
      <nav className="text-sm text-stone-500 mb-6">
        <Link href="/cellgrupper" className="hover:text-stone-900">
          {t.cellGroups.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-900">{t.cellGroups.createTitle}</span>
      </nav>

      <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-8">{t.cellGroups.createTitle}</h1>

      <form action={createGroup} className="space-y-6 bg-white rounded-xl border border-stone-200 p-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-800 mb-1.5">
            {t.cellGroups.nameLabel} *
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            placeholder={t.cellGroups.namePlaceholder}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-600/40"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-800 mb-1.5">
            {t.cellGroups.descriptionLabel}
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            placeholder={t.cellGroups.descriptionPlaceholder}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-600/40 resize-y"
          />
        </div>

        <div>
          <label htmlFor="meeting_info" className="block text-sm font-medium text-stone-800 mb-1.5">
            {t.cellGroups.meetingLabel}
          </label>
          <input
            id="meeting_info"
            name="meeting_info"
            maxLength={200}
            placeholder={t.cellGroups.meetingPlaceholder}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-600/40"
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3.5 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium transition-colors"
        >
          {t.cellGroups.create}
        </button>
      </form>
    </div>
  );
}

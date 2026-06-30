import { Suspense } from "react";
import { ProfileSearch } from "@/components/profile/ProfileSearch";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.network.title,
    description: t.network.subtitle,
  };
}

export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-stone-900">{t.network.title}</h1>
        <p className="text-sm text-stone-600 mt-1">{t.network.subtitle}</p>
      </header>
      <Suspense fallback={<div className="text-sm text-stone-500">{t.common.loading}</div>}>
        <ProfileSearch currentUserId={user?.id ?? null} />
      </Suspense>
    </div>
  );
}

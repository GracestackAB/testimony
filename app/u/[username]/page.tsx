import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/profile/Avatar";
import { getPublicProfileByUsername, getPublicContributionsByAuthor } from "@/lib/profile/server";
import { DENOMINATIONS, ROLES_IN_CHURCH } from "@/lib/profile/constants";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { FollowButton } from "@/components/network/FollowButton";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale, formatLocaleDate } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type Params = { username: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { username } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return { title: t.profile.notFound };
  return {
    title: profile.display_name,
    description: profile.bio ?? `${profile.display_name} ${t.profile.onSite}`,
  };
}

function denomLabel(v: string | null): string | null {
  if (!v) return null;
  return DENOMINATIONS.find((d) => d.value === v)?.label ?? null;
}

function roleLabel(v: string | null): string | null {
  if (!v) return null;
  return ROLES_IN_CHURCH.find((r) => r.value === v)?.label ?? null;
}

export default async function PublicProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const profile = await getPublicProfileByUsername(username);
  if (!profile) notFound();

  const contributions = await getPublicContributionsByAuthor(profile.id);

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const canMessage = Boolean(viewer && viewer.id !== profile.id && !profile.is_anonymized);

  const { data: followerCount } = await supabase.rpc("profile_follower_count", {
    p_user_id: profile.id,
  });

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <header className="flex items-start gap-5 mb-10">
        <Avatar src={profile.avatar_url} name={profile.display_name} size={112} />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-1">{profile.display_name}</h1>
          {profile.username && (
            <p className="text-stone-500 text-sm">@{profile.username}</p>
          )}
          {profile.headline && (
            <p className="text-stone-800 text-base mt-2 font-medium">{profile.headline}</p>
          )}
          {profile.bio && <p className="text-stone-700 text-sm mt-3 leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            {profile.open_to_connect && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-olive-50 text-olive-700 border border-olive-200">
                {t.network.openToConnect}
              </span>
            )}
            {profile.open_to_serve && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gold-300/20 text-gold-700 border border-gold-300/50">
                {t.network.openToServe}
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {profile.city && (
              <div className="flex gap-2"><dt className="text-stone-500">{t.profile.city}:</dt><dd className="text-stone-800">{profile.city}</dd></div>
            )}
            {profile.church && (
              <div className="flex gap-2"><dt className="text-stone-500">{t.profile.church}:</dt><dd className="text-stone-800">{profile.church}</dd></div>
            )}
            {denomLabel(profile.denomination) && (
              <div className="flex gap-2"><dt className="text-stone-500">{t.profile.denomination}:</dt><dd className="text-stone-800">{denomLabel(profile.denomination)}</dd></div>
            )}
            {roleLabel(profile.role_in_church) && (
              <div className="flex gap-2"><dt className="text-stone-500">{t.profile.role}:</dt><dd className="text-stone-800">{roleLabel(profile.role_in_church)}</dd></div>
            )}
            {profile.ministry_focus && (
              <div className="flex gap-2 sm:col-span-2"><dt className="text-stone-500">{t.network.ministryFocus}:</dt><dd className="text-stone-800">{profile.ministry_focus}</dd></div>
            )}
            {profile.favorite_verse && (
              <div className="flex gap-2 sm:col-span-2"><dt className="text-stone-500">{t.profile.favoriteVerse}:</dt><dd className="text-stone-800 italic">{profile.favorite_verse}</dd></div>
            )}
          </dl>

          <p className="text-xs text-stone-500 mt-4">
            {t.network.memberSince} {formatLocaleDate(profile.created_at, locale)}
            {typeof followerCount === "number" && followerCount > 0 && (
              <> · {followerCount} {t.network.followers}</>
            )}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <FollowButton userId={profile.id} viewerId={viewer?.id ?? null} />
            {canMessage && <StartConversationButton recipientId={profile.id} />}
          </div>
        </div>
      </header>

      {contributions.testimonies.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">{t.profile.testimonies}</h2>
          <ul className="space-y-3">
            {contributions.testimonies.map((t: { id: string; slug: string; title: string; lede: string | null; published_at: string | null }) => (
              <li key={t.id} className="p-4 border border-stone-200 rounded bg-parchment">
                <Link href={`/vittnesbord/${t.slug}`} className="font-serif text-lg font-semibold text-stone-900 hover:underline">
                  {t.title}
                </Link>
                {t.lede && <p className="text-sm text-stone-700 mt-1">{t.lede}</p>}
                {t.published_at && (
                  <p className="text-xs text-stone-500 mt-2">{formatLocaleDate(t.published_at, locale)}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {contributions.prayer_requests.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">{t.nav.prayerRequests}</h2>
          <ul className="space-y-3">
            {contributions.prayer_requests.map((p: { id: string; title: string | null; body: string; is_answered: boolean; created_at: string }) => (
              <li key={p.id} className="p-4 border border-stone-200 rounded bg-parchment">
                {p.title && <div className="font-medium text-stone-900 mb-1">{p.title}</div>}
                <p className="text-sm text-stone-700 line-clamp-3">{p.body}</p>
                <p className="text-xs text-stone-500 mt-2">
                  {p.is_answered && <span className="text-gold-700 font-medium">{t.profile.prayerAnswered} </span>}
                  {formatLocaleDate(p.created_at, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {contributions.prayer_answers.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">{t.profile.prayerAnswers}</h2>
          <ul className="space-y-3">
            {contributions.prayer_answers.map((p: { id: string; body: string; published_at: string | null }) => (
              <li key={p.id} className="p-4 border border-stone-200 rounded bg-parchment">
                <p className="text-sm text-stone-700">{p.body}</p>
                {p.published_at && (
                  <p className="text-xs text-stone-500 mt-2">{formatLocaleDate(p.published_at, locale)}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {contributions.gratitudes.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-4">{t.profile.gratitudes}</h2>
          <ul className="space-y-3">
            {contributions.gratitudes.map((g: { id: string; body: string; published_at: string | null }) => (
              <li key={g.id} className="p-4 border border-stone-200 rounded bg-parchment text-sm text-stone-700">
                {g.body}
              </li>
            ))}
          </ul>
        </section>
      )}

      {contributions.testimonies.length === 0 &&
        contributions.prayer_requests.length === 0 &&
        contributions.prayer_answers.length === 0 &&
        contributions.gratitudes.length === 0 && (
          <p className="text-stone-500">{t.profile.noContributions}</p>
        )}
    </div>
  );
}

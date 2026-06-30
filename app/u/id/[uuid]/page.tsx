import { notFound, redirect } from "next/navigation";
import { getPublicProfileById } from "@/lib/profile/server";
import { createClient } from "@/lib/supabase/server";
import { StartConversationButton } from "@/components/messages/StartConversationButton";
import { Avatar } from "@/components/profile/Avatar";

export const dynamic = "force-dynamic";

export default async function ProfileByIdPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const profile = await getPublicProfileById(uuid);
  if (!profile) notFound();
  if (profile.username) redirect(`/u/${profile.username}`);

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const canMessage = Boolean(viewer && viewer.id !== profile.id && !profile.is_anonymized);

  // Render minimal profile if no username
  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <header className="flex items-start gap-5 mb-8">
        <Avatar src={profile.avatar_url} name={profile.display_name} size={96} />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">{profile.display_name}</h1>
          {profile.bio && <p className="text-stone-700 mb-3 leading-relaxed">{profile.bio}</p>}
          <p className="text-stone-500 text-sm">
            Medlem sedan {new Date(profile.created_at).toLocaleDateString("sv-SE", { year: "numeric", month: "long" })}
          </p>
          {canMessage && (
            <div className="mt-4">
              <StartConversationButton recipientId={profile.id} />
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

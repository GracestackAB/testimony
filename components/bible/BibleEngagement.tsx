import { createClient } from "@/lib/supabase/server";
import { BibleReactions } from "./BibleReactions";
import { BibleComments } from "./BibleComments";

type Props = { bibleId: string };

export async function BibleEngagement({ bibleId }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: counts } = await supabase.rpc("get_reaction_counts", {
    p_kind: "daily_bible",
    p_id: bibleId,
  });

  let mine: string[] = [];
  let isModerator = false;
  if (user) {
    const [{ data: myReactions }, { data: profile }] = await Promise.all([
      supabase
        .from("reactions")
        .select("kind")
        .eq("content_kind", "daily_bible")
        .eq("content_id", bibleId)
        .eq("user_id", user.id),
      supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle(),
    ]);
    mine = (myReactions ?? []).map((r) => r.kind);
    isModerator = Boolean(profile?.is_moderator);
  }

  return (
    <div className="mt-8">
      <BibleReactions
        bibleId={bibleId}
        initialCounts={(counts as Record<string, number>) ?? {}}
        initialMine={mine}
        isAuthed={Boolean(user)}
      />
      <BibleComments
        bibleId={bibleId}
        isAuthed={Boolean(user)}
        myUserId={user?.id ?? null}
        isModerator={isModerator}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { useDict, useLocale } from "@/lib/i18n/client";

type CoopProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type CoopInvite = {
  id: string;
  save_id: string;
  host_id: string;
  partner_id: string;
  save_title?: string;
  host?: CoopProfile;
  partner?: CoopProfile;
};

type PartnerGame = {
  id: string;
  title: string;
  scenario_id: string;
  turn_count: number;
  active_turn_user_id: string | null;
  host?: CoopProfile;
};

type InGameProps = {
  mode: "ingame";
  saveId: string;
  coopStatus: string;
  partnerId: string | null;
  activeTurnUserId: string | null;
  userId: string;
  partner?: CoopProfile | null;
  onUpdate: () => void;
};

type MenuProps = {
  mode: "menu";
  userId: string;
  onJoinGame: (saveId: string) => void;
  onInviteAccepted?: () => void;
};

type Props = InGameProps | MenuProps;

function displayName(p: CoopProfile | null | undefined, fallback: string): string {
  return p?.displayName ?? p?.username ?? fallback;
}

export function AdventureCoopPanel(props: Props) {
  const t = useDict().games.bibleAdventureCoop;
  const { locale } = useLocale();
  const [invites, setInvites] = useState<CoopInvite[]>([]);
  const [partnerGames, setPartnerGames] = useState<PartnerGame[]>([]);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/games/bible-adventure/coop", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setInvites(data.invites ?? []);
    setPartnerGames(data.partnerGames ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/games/bible-adventure/coop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, locale }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || t.errorGeneric);
      return null;
    }
    await load();
  if (props.mode === "ingame") props.onUpdate();
    if (props.mode === "menu") props.onInviteAccepted?.();
    return data;
  }

  if (props.mode === "ingame") {
    const myTurn =
      props.coopStatus !== "active" ||
      !props.activeTurnUserId ||
      props.activeTurnUserId === props.userId;

    return (
      <div className="rounded-xl border border-stone-200 bg-white/90 p-4 mb-4">
        <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">{t.coopTitle}</p>
        {props.coopStatus === "active" && props.partner ? (
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              src={props.partner.avatarUrl}
              name={displayName(props.partner, "?")}
              size={40}
            />
            <div className="text-sm">
              <span className="text-stone-800 font-medium">
                {displayName(props.partner, t.companion)}
              </span>
              <span className="block text-xs text-stone-500">
                {myTurn ? t.yourTurn : t.waitingForPartner}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="text-sm text-stone-600 mb-2">{t.inviteHint}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
              />
              <button
                type="button"
                disabled={busy || username.trim().length < 2}
                onClick={() =>
                  void post({ action: "invite", saveId: props.saveId, username: username.trim() })
                }
                className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium disabled:opacity-50"
              >
                {t.inviteBtn}
              </button>
            </div>
          </div>
        )}
        {msg && <p className="text-sm text-olive-700">{msg}</p>}
        {err && <p className="text-sm text-red-700">{err}</p>}
        {props.coopStatus === "active" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void post({ action: "leave", saveId: props.saveId })}
            className="text-xs text-stone-400 hover:text-red-700"
          >
            {t.leaveCoop}
          </button>
        )}
      </div>
    );
  }

  const pendingForMe = invites.filter((i) => i.partner_id === props.userId);

  return (
    <div className="mb-8">
      <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">{t.menuTitle}</h2>
      {pendingForMe.length > 0 && (
        <ul className="space-y-2 mb-4">
          {pendingForMe.map((inv) => (
            <li
              key={inv.id}
              className="p-4 rounded-xl border border-olive-200 bg-olive-50/50 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar
                  src={inv.host?.avatarUrl}
                  name={displayName(inv.host, "?")}
                  size={40}
                />
                <div className="text-sm">
                  <p className="font-medium text-stone-900">
                    {displayName(inv.host, t.someone)} {t.invitesYou}
                  </p>
                  <p className="text-stone-600">{inv.save_title}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const data = await post({ action: "accept", inviteId: inv.id });
                    if (data?.saveId) props.onJoinGame(data.saveId as string);
                  }}
                  className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium"
                >
                  {t.accept}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void post({ action: "decline", inviteId: inv.id })}
                  className="px-4 py-2 rounded-full border border-stone-300 text-sm"
                >
                  {t.decline}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {partnerGames.length > 0 && (
        <ul className="space-y-2">
          {partnerGames.map((g) => {
            const myTurn = !g.active_turn_user_id || g.active_turn_user_id === props.userId;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => props.onJoinGame(g.id)}
                  className="w-full text-left p-4 rounded-xl border border-stone-200 bg-parchment hover:border-olive-300 flex items-center gap-3"
                >
                  <Avatar
                    src={g.host?.avatarUrl}
                    name={displayName(g.host, "?")}
                    size={40}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-stone-900">{g.title}</span>
                    <span className="block text-xs text-stone-500">
                      {t.withHost} {displayName(g.host, "?")} · {t.turn} {g.turn_count}
                      {myTurn ? ` · ${t.yourTurn}` : ` · ${t.waitingForPartner}`}
                    </span>
                  </span>
                  <span className="text-olive-700">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {pendingForMe.length === 0 && partnerGames.length === 0 && (
        <p className="text-sm text-stone-500 italic">{t.menuEmpty}</p>
      )}
      {err && <p className="text-sm text-red-700 mt-2">{err}</p>}
    </div>
  );
}

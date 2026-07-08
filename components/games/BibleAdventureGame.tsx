"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdventureCharacterSheet, AdventureArchetypePicker } from "@/components/games/AdventureCharacterSheet";
import { AdventureBestiary, AdventureEncounterCard } from "@/components/games/AdventureEncounterCard";
import { AdventureAllyCard, AdventureAllyRoster } from "@/components/games/AdventureAllyCard";
import { AdventureAmbience } from "@/components/games/AdventureAmbience";
import { AdventureBuffBar } from "@/components/games/AdventureBuffBar";
import { AdventureDiceRoll } from "@/components/games/AdventureDiceRoll";
import { AdventureSfx } from "@/components/games/AdventureSfx";
import { AdventureUltimateButton } from "@/components/games/AdventureUltimateButton";
import { AdventureEngagementHud } from "@/components/games/AdventureEngagementHud";
import { AdventureCoopPanel } from "@/components/games/AdventureCoopPanel";
import { AdventureCodex } from "@/components/games/AdventureCodex";
import { AdventureEndingCard } from "@/components/games/AdventureEndingCard";
import { AdventureInventory } from "@/components/games/AdventureInventory";
import { getItem, itemName } from "@/lib/games/bible-adventure/items";
import { VIRTUE_EMOJI, virtueLabel, type VirtueId } from "@/lib/games/bible-adventure/character";
import { allyName, getAlly } from "@/lib/games/bible-adventure/allies";
import { enemyName, getEnemy } from "@/lib/games/bible-adventure/enemies";
import { getMilestone, milestoneName } from "@/lib/games/bible-adventure/milestones";
import {
  ADVENTURE_SCENARIOS,
  type AdventureScenario,
} from "@/lib/games/bible-adventure/scenarios";
import type { AdventureSaveState, ChronicleEntry } from "@/lib/games/bible-adventure/state";
import { healthLabel } from "@/lib/games/bible-adventure/health";
import { canPrayFree, canRest, canFlee, faithLabel, TONE_EMOJI } from "@/lib/games/bible-adventure/state";
import { useDict, useLocale } from "@/lib/i18n/client";

type SaveSummary = {
  id: string;
  slot: number;
  title: string;
  scenario_id: string;
  turn_count: number;
  updated_at: string;
};

type SlotRow = { slot: number; save: SaveSummary | null };

type CoopProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type CoopMeta = {
  hostId: string;
  partnerId: string | null;
  coopStatus: string;
  activeTurnUserId: string | null;
};

type LoadedSave = {
  id: string;
  state: AdventureSaveState;
  user_id?: string;
  partner_id?: string | null;
  coop_status?: string;
  active_turn_user_id?: string | null;
  slot?: number;
};

type Phase = "menu" | "pick" | "archetype" | "playing" | "ended";

export function BibleAdventureGame() {
  const { locale } = useLocale();
  const t = useDict().games.bibleAdventure;
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("menu");
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [saveId, setSaveId] = useState<string | null>(null);
  const [state, setState] = useState<AdventureSaveState | null>(null);
  const [scenario, setScenario] = useState<AdventureScenario | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coopMeta, setCoopMeta] = useState<CoopMeta | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<CoopProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [useInspiration, setUseInspiration] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.chronicle, busy]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setNeedsLogin(false);
    const res = await fetch("/api/games/bible-adventure/saves");
    setLoading(false);
    if (res.status === 401) {
      setNeedsLogin(true);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || t.genericError);
      return;
    }
    setSlots(data.slots as SlotRow[]);
    if (data.userId) setUserId(data.userId as string);
  }, [t.genericError]);

  function applyLoadedSave(
    save: LoadedSave,
    opts?: { host?: CoopProfile | null; partner?: CoopProfile | null; slot?: number }
  ) {
    const sc = ADVENTURE_SCENARIOS.find((s) => s.id === save.state.scenarioId) ?? null;
    setSaveId(save.id);
    setState(save.state);
    setScenario(sc);
    if (opts?.slot) setActiveSlot(opts.slot);
    setCoopMeta({
      hostId: save.user_id ?? opts?.host?.id ?? "",
      partnerId: save.partner_id ?? null,
      coopStatus: save.coop_status ?? "solo",
      activeTurnUserId: save.active_turn_user_id ?? save.user_id ?? null,
    });
    if (save.coop_status === "active" && userId) {
      setPartnerProfile(
        userId === save.user_id
          ? (opts?.partner ?? null)
          : (opts?.host ?? null)
      );
    } else {
      setPartnerProfile(null);
    }
    setPhase(save.state.ended ? "ended" : "playing");
  }

  const myTurn =
    !coopMeta ||
    coopMeta.coopStatus !== "active" ||
    !coopMeta.activeTurnUserId ||
    coopMeta.activeTurnUserId === userId;

  const refreshSave = useCallback(async () => {
    if (!saveId) return;
    const res = await fetch(`/api/games/bible-adventure/saves?id=${saveId}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    const save = data.save as LoadedSave;
    setState(save.state);
    setCoopMeta({
      hostId: save.user_id ?? "",
      partnerId: save.partner_id ?? null,
      coopStatus: save.coop_status ?? "solo",
      activeTurnUserId: save.active_turn_user_id ?? save.user_id ?? null,
    });
    if (data.partner) setPartnerProfile(data.partner as CoopProfile);
    if (save.state.ended) setPhase("ended");
  }, [saveId]);

  useEffect(() => {
    if (!saveId || phase !== "playing" || myTurn) return;
    const timer = setInterval(() => void refreshSave(), 8000);
    return () => clearInterval(timer);
  }, [saveId, phase, myTurn, refreshSave]);

  useEffect(() => {
    const saveParam = searchParams.get("save");
    if (saveParam && userId && phase === "menu" && !busy) {
      void continueSaveById(saveParam);
    }
  }, [searchParams, userId, phase, busy]);

  async function continueSaveById(id: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/bible-adventure/saves?id=${id}`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || t.genericError);
      return;
    }
    applyLoadedSave(data.save as LoadedSave, {
      host: data.host as CoopProfile | null,
      partner: data.partner as CoopProfile | null,
      slot: (data.save as LoadedSave).slot,
    });
  }

  useEffect(() => {
    loadSlots();
  }, [loadSlots, locale]);

  function resetToMenu() {
    setPhase("menu");
    setActiveSlot(null);
    setSaveId(null);
    setState(null);
    setScenario(null);
    setCoopMeta(null);
    setPartnerProfile(null);
    setErr(null);
    setSelectedItem(null);
    setUseInspiration(false);
    loadSlots();
  }

  async function startNewInSlot(slot: number) {
    setActiveSlot(slot);
    setPhase("pick");
    setErr(null);
  }

  async function continueSave(summary: SaveSummary) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/bible-adventure/saves?id=${summary.id}`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || t.genericError);
      return;
    }
    const save = data.save as LoadedSave;
    applyLoadedSave(save, {
      host: data.host as CoopProfile | null,
      partner: data.partner as CoopProfile | null,
      slot: summary.slot,
    });
  }

  async function pickScenario(s: AdventureScenario) {
    if (!activeSlot || busy) return;
    setScenario(s);
    setPhase("archetype");
    setErr(null);
  }

  async function pickArchetype(archetypeId: string) {
    if (!activeSlot || !scenario || busy) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/games/bible-adventure/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: scenario.id, slot: activeSlot, locale, archetypeId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || t.genericError);
      return;
    }
    const save = data.save as LoadedSave;
    if (!save?.id || !save?.state?.choices?.length) {
      setErr(t.genericError);
      return;
    }
    applyLoadedSave(save, { slot: activeSlot });
    loadSlots();
  }

  async function deleteActiveSave() {
    if (!saveId || busy) return;
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    const res = await fetch(`/api/games/bible-adventure/saves?id=${saveId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || t.genericError);
      return;
    }
    resetToMenu();
  }

  async function runAction(action: "pray" | "use_item" | "rest" | "ultimate" | "flee", itemId?: string) {
    if (!saveId || !state || busy || state.ended) return;
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/games/bible-adventure/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saveId, action, itemId }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setErr(data.error || t.genericError);
      return;
    }

    setState(data.state as AdventureSaveState);
    setSelectedItem(null);
    loadSlots();
  }

  async function pickChoice(choiceId: string) {
    if (!saveId || !state || busy || state.ended || !myTurn) return;
    setBusy(true);
    setErr(null);
    setSelectedItem(null);

    const res = await fetch("/api/games/bible-adventure/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saveId, choiceId, useInspiration }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        setErr(t.loginRequired);
        setNeedsLogin(true);
      } else {
        setErr(data.error || t.genericError);
      }
      return;
    }

    const next = data.state as AdventureSaveState;
    setState(next);
    setUseInspiration(false);
    if (data.coop) {
      setCoopMeta({
        hostId: data.coop.hostId,
        partnerId: data.coop.partnerId,
        coopStatus: data.coop.status,
        activeTurnUserId: data.coop.activeTurnUserId,
      });
    }
    setPhase(next.ended ? "ended" : "playing");
    loadSlots();
  }

  function renderChronicleEntry(entry: ChronicleEntry, i: number) {
    if (entry.kind === "choice") {
      return (
        <div key={`c-${i}`} className="flex justify-end mb-2">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-olive-600 text-parchment px-4 py-2.5 text-sm">
            {entry.actorName && (
              <span className="block text-[10px] uppercase tracking-wide text-olive-200 mb-0.5">
                {entry.actorName}
              </span>
            )}
            {entry.label}
          </div>
        </div>
      );
    }
    if (entry.kind === "item") {
      const item = getItem(entry.itemId);
      const label = item ? itemName(item, locale) : entry.itemId;
      return (
        <div key={`i-${i}`} className="text-center text-xs text-stone-500 my-1">
          {entry.action === "gain" ? t.itemGained : t.itemLost} {item?.emoji} {label}
        </div>
      );
    }
    if (entry.kind === "faith") {
      const sign = entry.delta > 0 ? "+" : "";
      return (
        <div key={`f-${i}`} className="text-center text-xs text-olive-700 my-1">
          {t.faithChange} {sign}
          {entry.delta} → {entry.newValue}
        </div>
      );
    }
    if (entry.kind === "health") {
      const sign = entry.delta > 0 ? "+" : "";
      return (
        <div key={`h-${i}`} className="text-center text-xs text-rose-700 my-1">
          {t.healthChange} {sign}
          {entry.delta} → {entry.newValue}/{entry.maxHealth}
        </div>
      );
    }
    if (entry.kind === "whisper") {
      return (
        <div key={`w-${i}`} className="flex justify-center my-2">
          <div className="max-w-[90%] rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 italic leading-relaxed">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 not-italic font-semibold mb-1">
              ✨ {t.whisperLabel}
            </p>
            {entry.text}
            {entry.scriptureRef && (
              <p className="mt-2 text-xs text-olive-700 not-italic font-medium">
                📖 {entry.scriptureRef}
              </p>
            )}
          </div>
        </div>
      );
    }
    if (entry.kind === "milestone") {
      const m = getMilestone(entry.milestoneId);
      if (!m) return null;
      return (
        <div key={`m-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-olive-100 text-olive-800 text-xs font-medium">
            {m.emoji} {t.milestoneEarned}: {milestoneName(m, locale)}
          </span>
        </div>
      );
    }
    if (entry.kind === "roll") {
      const virtue = entry.virtue as VirtueId;
      const emoji = VIRTUE_EMOJI[virtue] ?? "🎲";
      const modStr = entry.modifier >= 0 ? `+${entry.modifier}` : `${entry.modifier}`;
      return (
        <div key={`r-${i}`} className="flex justify-center my-2">
          <div
            className={`max-w-[90%] rounded-xl border px-4 py-3 text-sm ${
              entry.success
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                : "border-amber-200 bg-amber-50/80 text-amber-950"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1">
              🎲 {t.skillCheck}: {emoji} {virtueLabel(virtue, locale)}
              {entry.inspiration && " ✨"}
            </p>
            <p className="tabular-nums">
              {t.rollLine} {entry.d20}
              {entry.d20Second ? ` + ${entry.d20Second}` : ""} {modStr} = {entry.total}{" "}
              {locale === "sv" ? "mot" : "vs"} {t.dcLabel} {entry.dc}
            </p>
            <p className="font-medium mt-1">
              {entry.success ? t.rollSuccess : t.rollFailure}
            </p>
          </div>
        </div>
      );
    }
    if (entry.kind === "quest") {
      return (
        <div key={`q-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-medium">
            📜 {t.questUpdate}: {entry.text}
          </span>
        </div>
      );
    }
    if (entry.kind === "level") {
      return (
        <div key={`l-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-900 text-xs font-semibold">
            ⬆️ {t.levelUp} {entry.level}
          </span>
        </div>
      );
    }
    if (entry.kind === "encounter") {
      const enemy = getEnemy(entry.enemyId as Parameters<typeof getEnemy>[0]);
      const label = enemy ? enemyName(enemy, locale) : entry.enemyId;
      return (
        <div key={`e-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/10 text-stone-800 text-xs font-medium">
            {entry.action === "appear" ? "⚔️" : entry.action === "defeat" ? "🏆" : "🕊️"}{" "}
            {entry.action === "appear"
              ? t.encounterAppear
              : entry.action === "defeat"
                ? t.encounterDefeat
                : t.encounterDepart}{" "}
            {label}
          </span>
        </div>
      );
    }
    if (entry.kind === "ally") {
      const ally = getAlly(entry.allyId as Parameters<typeof getAlly>[0]);
      const label = ally ? allyName(ally, locale) : entry.allyId;
      return (
        <div key={`a-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-medium">
            {entry.action === "appear" ? "🤝" : "👋"}{" "}
            {entry.action === "appear" ? t.allyAppear : t.allyDepart} {label}
          </span>
        </div>
      );
    }
    if (entry.kind === "ultimate") {
      return (
        <div key={`u-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-900 text-xs font-semibold">
            ✨ {t.ultimateActivated} {entry.name}
          </span>
        </div>
      );
    }
    if (entry.kind === "loot") {
      const item = getItem(entry.itemId);
      const label = item ? itemName(item, locale) : entry.itemId;
      return (
        <div key={`lo-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            🎁 {t.lootGained} {item?.emoji} {label}
          </span>
        </div>
      );
    }
    if (entry.kind === "flee") {
      const enemy = getEnemy(entry.enemyId as Parameters<typeof getEnemy>[0]);
      const label = enemy ? enemyName(enemy, locale) : entry.enemyId;
      return (
        <div key={`fl-${i}`} className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-200 text-stone-800 text-xs font-medium">
            🏃 {t.fleeLabel} {label}
          </span>
        </div>
      );
    }
    if (entry.kind === "chapter") {
      return (
        <div key={`ch-${i}`} className="text-center my-3">
          <span className="inline-block px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-900 text-sm font-serif font-semibold">
            📜 {entry.title}
          </span>
        </div>
      );
    }
    if (entry.kind === "enemy_hit") {
      return (
        <div key={`eh-${i}`} className="text-center text-xs text-rose-700 my-1">
          ⚔️ {t.enemyDamaged} -{entry.damage} ({entry.remaining} {t.enemyHpLeft})
        </div>
      );
    }
    if (entry.kind === "critical") {
      return (
        <div key={`cr-${i}`} className="text-center my-2">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
              entry.roll === "nat20"
                ? "bg-amber-100 text-amber-900"
                : "bg-stone-200 text-stone-800"
            }`}
          >
            {entry.roll === "nat20" ? `✨ ${t.critical20}` : `💫 ${t.critical1}`}
          </span>
        </div>
      );
    }
    if (entry.kind === "narrative") {
      return (
        <div key={`n-${i}`} className="flex justify-start mb-3">
          <div className="max-w-[95%] rounded-2xl rounded-bl-md bg-white border border-stone-200 px-4 py-3 text-sm text-stone-800 leading-relaxed">
            <p className="whitespace-pre-wrap">{entry.text}</p>
            {entry.scriptureNote && (
              <p className="mt-2 text-xs text-olive-700 font-medium">📖 {entry.scriptureNote}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  if (loading && phase === "menu") {
    return <p className="text-center text-stone-500">{t.loading}</p>;
  }

  if (needsLogin && phase === "menu") {
    return (
      <div className="text-center rounded-xl border border-stone-200 bg-stone-50 p-8">
        <p className="text-stone-700 mb-4">{t.loginRequired}</p>
        <Link href="/login" className="font-medium text-olive-700 underline">
          {t.loginLink}
        </Link>
      </div>
    );
  }

  if (phase === "menu") {
    return (
      <div>
        <p className="text-stone-600 text-center leading-relaxed mb-8 max-w-xl mx-auto">
          {t.menuIntro}
        </p>
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        )}
        {userId && (
          <AdventureCoopPanel
            mode="menu"
            userId={userId}
            onJoinGame={(id) => void continueSaveById(id)}
            onInviteAccepted={() => loadSlots()}
          />
        )}
        <ul className="space-y-3">
          {slots.map(({ slot, save }) => (
            <li
              key={slot}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-stone-200 rounded-xl bg-parchment"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-stone-500">
                  {t.slotLabel} {slot}
                </p>
                {save ? (
                  <>
                    <p className="font-medium text-stone-900">{save.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {t.turn} {save.turn_count} · {new Date(save.updated_at).toLocaleDateString(locale)}
                    </p>
                  </>
                ) : (
                  <p className="text-stone-400 italic">{t.emptySlot}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {save ? (
                  <button
                    type="button"
                    onClick={() => continueSave(save)}
                    disabled={busy}
                    className="px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700"
                  >
                    {t.continueGame}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => startNewInSlot(slot)}
                  disabled={busy}
                  className="px-4 py-2 rounded-full border border-stone-300 text-stone-800 text-sm font-medium hover:border-olive-500"
                >
                  {save ? t.newGameOverwrite : t.newGame}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "pick") {
    return (
      <div>
        <button
          type="button"
          onClick={resetToMenu}
          className="text-sm text-stone-500 hover:text-olive-700 mb-4"
        >
          ← {t.backToSlots}
        </button>
        <p className="text-stone-600 text-center mb-6">{t.pickIntro}</p>
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
            {needsLogin && (
              <Link href="/login" className="block mt-2 font-medium text-olive-700 underline">
                {t.loginLink}
              </Link>
            )}
          </div>
        )}
        {busy && (
          <p className="text-center text-stone-500 text-sm mb-4 italic">{t.starting}</p>
        )}
        <ul className="space-y-4">
          {ADVENTURE_SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pickScenario(s)}
                disabled={busy}
                className="w-full text-left flex items-start gap-4 p-5 border border-stone-200 rounded-xl bg-parchment hover:bg-olive-50/40 hover:border-olive-300 transition-colors disabled:opacity-60"
              >
                <span className="text-3xl" aria-hidden>
                  {s.emoji}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-lg font-semibold text-stone-900">
                    {s.title[locale]}
                  </span>
                  <span className="block text-xs text-olive-700 mt-0.5">{s.bibleRef[locale]}</span>
                  <span className="block text-sm text-stone-600 mt-1">{s.tagline[locale]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "archetype" && scenario) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setPhase("pick")}
          className="text-sm text-stone-500 hover:text-olive-700 mb-4"
        >
          ← {t.pickIntro}
        </button>
        <p className="text-center text-stone-500 text-sm mb-2">
          {scenario.emoji} {scenario.title[locale]}
        </p>
        <p className="text-stone-600 text-center mb-6">{t.pickArchetypeIntro}</p>
        {err && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {err}
          </div>
        )}
        {busy && (
          <p className="text-center text-stone-500 text-sm mb-4 italic">{t.starting}</p>
        )}
        <AdventureArchetypePicker onPick={(id) => void pickArchetype(id)} busy={busy} />
      </div>
    );
  }

  if (!state) return null;

  const faithPct = state.faith;
  const faithText = faithLabel(state.faith, locale);
  const healthPct = state.maxHealth > 0 ? (state.health / state.maxHealth) * 100 : 0;
  const healthText = healthLabel(state.health, state.maxHealth, locale);
  const activeEnemy = state.activeEncounter ? getEnemy(state.activeEncounter) : null;
  const activeAlly = state.activeAlly ? getAlly(state.activeAlly) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <AdventureSfx chronicle={state.chronicle} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <span className="font-medium text-stone-800">
            {scenario?.title[locale] ?? state.location}
          </span>
          <span className="text-stone-500"> · {state.location}</span>
        </div>
        <div className="flex items-center gap-3">
          <AdventureAmbience scenarioId={state.scenarioId} />
          <button
            type="button"
            onClick={resetToMenu}
            className="text-stone-500 hover:text-olive-700"
          >
            {t.backToSlots}
          </button>
          <button
            type="button"
            onClick={deleteActiveSave}
            className="text-stone-400 hover:text-red-700"
          >
            {t.deleteSave}
          </button>
        </div>
      </div>

      {userId && saveId && (
        <AdventureCoopPanel
          mode="ingame"
          saveId={saveId}
          userId={userId}
          coopStatus={coopMeta?.coopStatus ?? "solo"}
          partnerId={coopMeta?.partnerId ?? null}
          activeTurnUserId={coopMeta?.activeTurnUserId ?? null}
          partner={partnerProfile}
          onUpdate={() => void refreshSave()}
        />
      )}

      {!myTurn && phase === "playing" && (
        <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 text-center">
          {t.coopWaiting}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>{t.faithMeter}</span>
            <span>
              {faithText} ({faithPct})
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full bg-olive-500 transition-all duration-500"
              style={{ width: `${faithPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>{t.healthMeter}</span>
            <span>
              {healthText} ({state.health}/{state.maxHealth})
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                healthPct <= 25 ? "bg-rose-600" : healthPct <= 50 ? "bg-amber-500" : "bg-rose-400"
              }`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-400 mb-4 -mt-2">
        {t.turn} {state.turn}
      </p>

      <div className="mb-4">
        <AdventureCharacterSheet state={state} />
      </div>

      <AdventureBuffBar state={state} />

      {activeEnemy && (
        <div className="mb-4">
          <AdventureEncounterCard
            enemy={activeEnemy}
            enemyHealth={state.enemyHealth}
            enemyMaxHealth={state.enemyMaxHealth}
          />
        </div>
      )}

      {activeAlly && (
        <div className="mb-4">
          <AdventureAllyCard ally={activeAlly} />
        </div>
      )}

      <div className="mb-4">
        <AdventureEngagementHud state={state} />
      </div>

      <div className="mb-4">
        <AdventureBestiary enemyIds={state.encounteredEnemies} />
      </div>

      <div className="mb-4">
        <AdventureAllyRoster allyIds={state.metAllies} />
      </div>

      <div className="mb-4">
        <AdventureCodex state={state} />
      </div>

      <div className="mb-4">
        <AdventureInventory
          state={state}
          inventory={state.inventory}
          selectedItem={selectedItem}
          onSelect={setSelectedItem}
          onUseItem={(id) => runAction("use_item", id)}
          busy={busy}
        />
      </div>

      {phase === "playing" && canFlee(state) && !busy && myTurn && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => runAction("flee")}
            className="w-full py-3 rounded-xl border border-stone-300 bg-stone-100/80 text-stone-800 text-sm font-medium hover:bg-stone-200/80 transition-colors"
          >
            🏃 {t.fleeButton}
          </button>
        </div>
      )}

      {phase === "playing" && !busy && myTurn && (
        <AdventureUltimateButton
          state={state}
          busy={busy}
          onUse={() => runAction("ultimate")}
        />
      )}

      {phase === "playing" && canPrayFree(state) && !busy && myTurn && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => runAction("pray")}
            className="w-full py-3 rounded-xl border border-olive-300 bg-olive-50/60 text-olive-900 text-sm font-medium hover:bg-olive-100 transition-colors"
          >
            🙏 {t.prayButton}
          </button>
        </div>
      )}

      {phase === "playing" && canRest(state) && !busy && myTurn && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => runAction("rest")}
            className="w-full py-3 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-950 text-sm font-medium hover:bg-rose-100/60 transition-colors"
          >
            🏕️ {t.restButton} ({state.restsUsed}/{2})
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="rounded-xl border border-stone-200 bg-stone-50/50 max-h-[min(50vh,26rem)] overflow-y-auto p-4 mb-4"
      >
        {state.chronicle.map((entry, i) => renderChronicleEntry(entry, i))}
        <AdventureDiceRoll active={busy} />
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-stone-200 px-4 py-3 text-sm text-stone-500 italic">
              {t.thinking}
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
          {needsLogin && (
            <Link href="/login" className="block mt-2 font-medium text-olive-700 underline">
              {t.loginLink}
            </Link>
          )}
        </div>
      )}

      {phase === "ended" && <AdventureEndingCard state={state} />}

      {phase === "ended" && state.reflection && (
        <div className="mb-4 rounded-xl border border-olive-200 bg-olive-50/60 p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-olive-700 font-semibold mb-2">
            {t.reflectionLabel}
          </p>
          <p className="text-stone-800 leading-relaxed">{state.reflection}</p>
        </div>
      )}

      {phase === "playing" && state.choices.length > 0 && !busy && myTurn && (
        <div>
          {state.choices.some((c) => c.skillCheck) && !state.inspirationUsed && (
            <label className="flex items-center gap-2 mb-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60 text-sm text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={useInspiration}
                onChange={(e) => setUseInspiration(e.target.checked)}
                className="rounded border-amber-400"
              />
              <span>{t.useInspiration}</span>
            </label>
          )}
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{t.yourMove}</p>
          <ul className="space-y-2">
            {state.choices.map((c) => {
              const req = c.requiresItem ? getItem(c.requiresItem) : null;
              const sc = c.skillCheck;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickChoice(c.id)}
                    className="w-full text-left p-4 rounded-xl border border-stone-200 bg-white hover:border-olive-400 hover:bg-olive-50/50 text-stone-800 text-sm font-medium transition-colors"
                  >
                    <span className="flex items-start gap-2">
                      {c.tone && (
                        <span className="shrink-0 text-base" title={c.tone} aria-hidden>
                          {TONE_EMOJI[c.tone]}
                        </span>
                      )}
                      <span className="flex-1">{c.label}</span>
                    </span>
                    {sc && (
                      <span className="block text-xs text-violet-800 mt-1.5 font-normal">
                        🎲 {t.skillCheck}: {VIRTUE_EMOJI[sc.virtue]}{" "}
                        {virtueLabel(sc.virtue, locale)} · {t.dcLabel} {sc.dc}
                      </span>
                    )}
                    {req && (
                      <span className="block text-xs text-olive-700 mt-1 font-normal">
                        {t.requiresItem} {req.emoji} {itemName(req, locale)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {phase === "ended" && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={resetToMenu}
            className="px-6 py-3 rounded-full bg-olive-600 text-parchment hover:bg-olive-700 font-medium"
          >
            {t.backToSlots}
          </button>
          <Link
            href="/spel"
            className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 hover:border-olive-500 font-medium text-center"
          >
            {t.backToGames}
          </Link>
        </div>
      )}

      <p className="mt-6 text-xs text-stone-400 text-center leading-relaxed">{t.disclaimer}</p>
    </div>
  );
}

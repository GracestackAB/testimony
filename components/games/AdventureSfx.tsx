"use client";

import { useEffect, useRef } from "react";
import type { ChronicleEntry } from "@/lib/games/bible-adventure/state";
import { playSfx, readSfxEnabled, type SfxKind } from "@/lib/games/bible-adventure/sfx";

type Props = {
  chronicle: ChronicleEntry[];
};

function sfxForEntry(entry: ChronicleEntry): SfxKind | null {
  if (entry.kind === "roll") return "dice";
  if (entry.kind === "enemy_hit") return "hit";
  if (entry.kind === "encounter" && entry.action === "defeat") return "defeat";
  if (entry.kind === "ultimate") return "ultimate";
  if (entry.kind === "loot") return "loot";
  if (entry.kind === "flee") return "flee";
  if (entry.kind === "ally" && entry.action === "appear") return "ally";
  return null;
}

export function AdventureSfx({ chronicle }: Props) {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastLen = useRef(chronicle.length);

  useEffect(() => {
    if (!readSfxEnabled()) return;
    if (chronicle.length <= lastLen.current) {
      lastLen.current = chronicle.length;
      return;
    }

    const newEntries = chronicle.slice(lastLen.current);
    lastLen.current = chronicle.length;

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    for (const entry of newEntries) {
      const kind = sfxForEntry(entry);
      if (kind) playSfx(ctx, kind);
    }
  }, [chronicle]);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return null;
}

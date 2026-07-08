"use client";

import { useEffect, useRef, useState } from "react";
import {
  AMBIENCE_PROFILES,
  readAmbienceEnabled,
  writeAmbienceEnabled,
} from "@/lib/games/bible-adventure/ambience";
import { readSfxEnabled, writeSfxEnabled } from "@/lib/games/bible-adventure/sfx";
import type { AdventureScenarioId } from "@/lib/games/bible-adventure/scenarios";
import { useDict } from "@/lib/i18n/client";

type Props = {
  scenarioId: AdventureScenarioId;
};

function createBrownNoise(ctx: AudioContext, gain: number): { node: AudioBufferSourceNode; gain: GainNode } {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode);
  return { node: source, gain: gainNode };
}

export function AdventureAmbience({ scenarioId }: Props) {
  const t = useDict().games.bibleAdventure;
  const [enabled, setEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setEnabled(readAmbienceEnabled());
    setSfxEnabled(readSfxEnabled());
  }, []);

  useEffect(() => {
    stopRef.current?.();
    stopRef.current = null;

    if (!enabled) return;

    const profile = AMBIENCE_PROFILES[scenarioId];
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = profile.baseFreq;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.35;
    drone.connect(droneGain);
    droneGain.connect(master);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = profile.lfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);

    const { node: noise, gain: noiseGain } = createBrownNoise(ctx, profile.noiseGain);
    noiseGain.connect(master);

    drone.start();
    lfo.start();
    noise.start();

    void ctx.resume();

    const stop = () => {
      try {
        drone.stop();
        lfo.stop();
        noise.stop();
      } catch {
        /* already stopped */
      }
      void ctx.close();
    };
    stopRef.current = stop;

    return () => {
      stop();
      stopRef.current = null;
    };
  }, [enabled, scenarioId]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    writeAmbienceEnabled(next);
  }

  function toggleSfx() {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    writeSfxEnabled(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        title={enabled ? t.ambienceOff : t.ambienceOn}
        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white/80 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
      </button>
      <button
        type="button"
        onClick={toggleSfx}
        title={sfxEnabled ? t.sfxOff : t.sfxOn}
        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white/80 px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <span aria-hidden>{sfxEnabled ? "🎵" : "🔕"}</span>
      </button>
    </div>
  );
}

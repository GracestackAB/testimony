export type SfxKind = "dice" | "hit" | "defeat" | "ultimate" | "loot" | "flee" | "ally";

const SFX_STORAGE_KEY = "bibel-aventyr-sfx";

export function readSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SFX_STORAGE_KEY) !== "off";
}

export function writeSfxEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SFX_STORAGE_KEY, on ? "on" : "off");
}

/** Kort procedural ljudeffekt via Web Audio. */
export function playSfx(ctx: AudioContext, kind: SfxKind): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(master);

  switch (kind) {
    case "dice":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    case "hit":
      osc.type = "square";
      osc.frequency.setValueAtTime(120, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    case "defeat":
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    case "ultimate":
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(660, now + 0.2);
      osc.frequency.linearRampToValueAtTime(440, now + 0.45);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    case "loot":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(780, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    case "flee":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
      break;
    case "ally":
      osc.type = "sine";
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.setValueAtTime(494, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
      break;
  }
}

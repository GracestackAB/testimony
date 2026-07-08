"use client";

type Props = {
  active?: boolean;
};

export function AdventureDiceRoll({ active }: Props) {
  if (!active) return null;

  return (
    <div className="flex justify-center my-3" aria-live="polite">
      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/90 px-5 py-3">
        <span className="text-2xl animate-bounce" aria-hidden>
          🎲
        </span>
        <span className="font-mono text-lg font-bold text-violet-900 tabular-nums animate-pulse">
          ···
        </span>
      </div>
    </div>
  );
}

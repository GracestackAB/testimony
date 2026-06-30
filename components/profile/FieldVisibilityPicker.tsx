"use client";
import {
  FIELD_VISIBILITY_KEYS,
  FIELD_VISIBILITY_LABELS,
  type FieldVisibility,
  type FieldVisibilityKey,
} from "@/lib/profile/constants";

type Props = {
  value: Record<FieldVisibilityKey, FieldVisibility>;
  onChange: (key: FieldVisibilityKey, val: FieldVisibility) => void;
};

const OPTS: { value: FieldVisibility; label: string }[] = [
  { value: "public", label: "Publik" },
  { value: "members_only", label: "Inloggade" },
  { value: "private", label: "Privat" },
];

export function FieldVisibilityPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {FIELD_VISIBILITY_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-stone-100 last:border-0">
          <span className="text-sm text-stone-800">{FIELD_VISIBILITY_LABELS[key]}</span>
          <div className="inline-flex rounded-md border border-stone-300 overflow-hidden text-xs">
            {OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(key, opt.value)}
                className={`px-3 py-1.5 transition-colors ${
                  value[key] === opt.value
                    ? "bg-olive-600 text-parchment"
                    : "bg-parchment text-stone-700 hover:bg-stone-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";
import { useDict } from "@/lib/i18n/client";

export function PrayButton({
  contentId,
  contentKind,
  initialCount,
  initiallyPressed,
}: {
  contentId: string;
  contentKind: "prayer_request" | "testimony" | "prayer_answer";
  initialCount: number;
  initiallyPressed: boolean;
}) {
  const t = useDict();
  const [count, setCount] = useState(initialCount);
  const [pressed, setPressed] = useState(initiallyPressed);
  const [busy, startTransition] = useTransition();
  const [animate, setAnimate] = useState(false);
  const toast = useToast();

  async function toggle() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const wasPressed = pressed;
    setPressed(!wasPressed);
    setCount((c) => (wasPressed ? Math.max(0, c - 1) : c + 1));
    setAnimate(true);
    setTimeout(() => setAnimate(false), 450);

    if (wasPressed) {
      const { error } = await supabase.from("reactions").delete()
        .eq("content_id", contentId)
        .eq("content_kind", contentKind)
        .eq("user_id", user.id)
        .eq("kind", "praying");
      if (error) {
        setPressed(true);
        setCount((c) => c + 1);
        toast.error(t.pray.removeError, { haptic: true });
      } else {
        toast.show(t.pray.unmarked, { variant: "info" });
      }
    } else {
      const { error } = await supabase.from("reactions").insert({
        content_id: contentId,
        content_kind: contentKind,
        user_id: user.id,
        kind: "praying",
      });
      if (error) {
        setPressed(false);
        setCount((c) => Math.max(0, c - 1));
        toast.error(t.pray.registerError, { haptic: true });
      } else {
        toast.success(t.pray.thankYou, { haptic: true });
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => startTransition(toggle)}
      disabled={busy}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition active:scale-95 disabled:opacity-70 ${
        pressed
          ? "bg-olive-600 text-parchment border-olive-600"
          : "bg-parchment text-stone-700 border-stone-300 hover:border-olive-500"
      }`}
    >
      <span className={animate ? "inline-block animate-[pray-pop_450ms_ease-out]" : "inline-block"}>🙏</span>
      <span>{pressed ? t.pray.praying : t.pray.prayForThis}</span>
      <span className="text-xs opacity-80">· {count}</span>
      <style jsx>{`
        @keyframes pray-pop {
          0% { transform: scale(1) rotate(0); }
          35% { transform: scale(1.4) rotate(-10deg); }
          70% { transform: scale(1.1) rotate(8deg); }
          100% { transform: scale(1) rotate(0); }
        }
      `}</style>
    </button>
  );
}

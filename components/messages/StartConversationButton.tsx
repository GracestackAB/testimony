"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  recipientId: string;
  className?: string;
  children?: React.ReactNode;
};

export function StartConversationButton({ recipientId, className, children }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: recipientId }),
      });
      const j = await res.json();
      if (!res.ok || !j.conversation_id) {
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError(
          j.error === "blocked"
            ? "Du kan inte skicka meddelande till denna användare."
            : "Kunde inte starta konversation."
        );
        return;
      }
      router.push(`/meddelanden/${j.conversation_id}`);
    } catch {
      setError("Nätverksfel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-50 transition-colors"
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {children ?? (loading ? "Öppnar…" : "Skicka meddelande")}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/messages/types";

type Props = {
  conversationId: string;
  myUserId: string;
  initialMessages: Message[];
  other: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function MessageThread({ conversationId, myUserId, initialMessages, other }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/messages/${conversationId}/read`, { method: "POST" });
    } catch {
      // ignorera
    }
  }, [conversationId]);

  useEffect(() => {
    void markRead();
    const onVis = () => {
      if (document.visibilityState === "visible") void markRead();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [markRead]);

  // Realtime-prenumeration på nya meddelanden
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "testimony",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id !== myUserId) void markRead();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, myUserId, markRead]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(
          j.error === "blocked"
            ? "Meddelandet kunde inte skickas (blockerat)."
            : "Kunde inte skicka meddelandet."
        );
        return;
      }
      setBody("");
      // Realtime adderar meddelandet, men addera direkt för snabb feedback
      if (j.message) {
        setMessages((prev) => {
          if (prev.some((x) => x.id === j.message.id)) return prev;
          return [...prev, j.message];
        });
      }
    } catch {
      setError("Nätverksfel.");
    } finally {
      setSending(false);
    }
  }

  const otherName = other.display_name ?? other.username ?? "Användare";

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[400px] bg-parchment border border-stone-200 rounded-lg overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 bg-stone-50">
        <Avatar src={other.avatar_url} name={otherName} size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-serif text-base font-semibold text-stone-900 truncate">{otherName}</div>
          {other.username && <div className="text-xs text-stone-500">@{other.username}</div>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-stone-500 py-8">
            Inga meddelanden ännu. Skriv något vänligt och kristusinspirerat!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    mine
                      ? "bg-olive-600 text-parchment rounded-br-md"
                      : "bg-stone-100 text-stone-900 rounded-bl-md border border-stone-200"
                  }`}
                >
                  {m.body}
                  <div
                    className={`text-[10px] mt-1 ${mine ? "text-parchment/70" : "text-stone-500"}`}
                  >
                    {formatTime(m.created_at)}
                    {mine && m.read_at ? " · läst" : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-stone-200 bg-stone-50 p-3">
        {error && (
          <div className="mb-2 text-xs text-red-600">{error}</div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e as unknown as FormEvent);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={`Skriv till ${otherName}…`}
            className="flex-1 resize-none rounded-lg border border-stone-300 bg-parchment px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500/40 focus:border-olive-500 min-h-[40px] max-h-40"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="px-4 py-2 rounded-lg bg-olive-600 text-parchment text-sm font-medium hover:bg-olive-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Skicka
          </button>
        </div>
        <p className="text-[10px] text-stone-500 mt-1.5">
          Var en tjänare för Kristus i dina ord. Tryck Enter för att skicka, Shift+Enter för ny rad.
        </p>
      </form>
    </div>
  );
}

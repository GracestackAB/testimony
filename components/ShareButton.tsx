"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";

type Props = {
  url?: string;
  title?: string;
  text?: string;
  label?: string;
  variant?: "primary" | "secondary" | "minimal";
  className?: string;
};

export function ShareButton({
  url,
  title,
  text,
  label = "Dela",
  variant = "secondary",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const shareData = { url: shareUrl, title, text };

    // Web Share API (mobil + moderna browsers)
    if (typeof navigator !== "undefined" && navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
        toast.success("Tack för att du delade ✨", { haptic: true });
        return;
      } catch {
        // User cancelled — fall through
      }
    }

    // Fallback: kopiera länk
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setOpen(true);
      toast.success("Länk kopierad!", { haptic: true });
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 2500);
    } catch {
      // fallback till prompt
      window.prompt("Kopiera länken:", shareUrl);
    }
  }

  const styles = {
    primary: "bg-olive-600 text-parchment hover:bg-olive-700",
    secondary: "bg-white border border-stone-300 text-stone-800 hover:border-olive-500",
    minimal: "text-stone-600 hover:text-olive-700",
  }[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm transition-colors ${styles} ${className}`}
      aria-label={label}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "Länk kopierad!" : label}
      {open && !copied && <span className="sr-only">öppet</span>}
    </button>
  );
}

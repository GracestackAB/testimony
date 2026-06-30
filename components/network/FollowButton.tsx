"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/client";

type Props = {
  userId: string;
  initialFollowing?: boolean;
  viewerId: string | null;
};

export function FollowButton({ userId, initialFollowing = false, viewerId }: Props) {
  const dict = useDict();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!viewerId || viewerId === userId) return;
    fetch(`/api/network/follow?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (typeof j.following === "boolean") setFollowing(j.following);
      })
      .catch(() => undefined);
  }, [userId, viewerId]);

  if (!viewerId) {
    return (
      <Link
        href={`/login?next=/u/id/${userId}`}
        className="inline-flex px-4 py-2 rounded-full border border-stone-300 text-sm font-medium text-stone-700 hover:border-olive-500"
      >
        {dict.network.loginToFollow}
      </Link>
    );
  }

  if (viewerId === userId) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (following) {
        await fetch(`/api/network/follow?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
        setFollowing(false);
      } else {
        await fetch("/api/network/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      className={`inline-flex px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${
        following
          ? "border border-olive-600 text-olive-700 bg-olive-50 hover:bg-olive-100"
          : "bg-stone-900 text-parchment hover:bg-stone-800"
      }`}
    >
      {following ? dict.network.following : dict.network.follow}
    </button>
  );
}

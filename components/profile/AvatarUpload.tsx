"use client";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/profile/constants";

type Props = {
  currentUrl: string | null;
  name: string | null;
  onUploaded: (url: string) => void;
  onDeleted?: () => void;
};

async function resizeToWebp(file: File, max = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unsupported");
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
    );
    if (!blob) throw new Error("encode_failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUpload({ currentUrl, name, onUploaded, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (file.size > AVATAR_MAX_BYTES) {
      setErr("Filen är för stor (max 2 MB).");
      return;
    }
    if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
      setErr("Endast JPEG, PNG eller WebP.");
      return;
    }
    setBusy(true);
    try {
      let upload: Blob = file;
      try {
        upload = await resizeToWebp(file, 512);
      } catch {
        // fallback to raw file
      }
      const form = new FormData();
      form.append("file", upload, "avatar.webp");
      const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error ?? "Uppladdning misslyckades.");
      } else {
        onUploaded(json.avatar_url);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("Ta bort din profilbild?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (res.ok) onDeleted?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={currentUrl} name={name} size={88} />
      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center justify-center px-4 py-2 rounded border border-stone-300 bg-stone-50 hover:bg-stone-100 cursor-pointer text-sm font-medium text-stone-800">
          {currentUrl ? "Byt bild" : "Ladda upp bild"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
            disabled={busy}
          />
        </label>
        {currentUrl && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-sm text-stone-600 hover:text-red-700 underline text-left"
          >
            Ta bort bild
          </button>
        )}
        {err && <p className="text-sm text-red-700">{err}</p>}
        <p className="text-xs text-stone-500">JPEG, PNG eller WebP. Max 2 MB.</p>
      </div>
    </div>
  );
}

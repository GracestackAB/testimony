type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFromName(name: string | null | undefined): string {
  if (!name) return "from-stone-300 to-stone-400";
  const palettes = [
    "from-olive-300 to-olive-500",
    "from-gold-300 to-gold-500",
    "from-stone-300 to-stone-500",
    "from-olive-100 to-olive-300",
    "from-gold-300 to-olive-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

export function Avatar({ src, name, size = 96, className = "" }: AvatarProps) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ?? "Profilbild"}
        width={size}
        height={size}
        className={`rounded-full object-cover bg-stone-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const grad = colorFromName(name);
  return (
    <div
      className={`rounded-full flex items-center justify-center font-serif font-semibold text-stone-50 bg-gradient-to-br ${grad} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={name ?? "Profilbild"}
    >
      {initials(name)}
    </div>
  );
}

import Link from "next/link";

type LogoProps = {
  /** Visa endast symbolen (t.ex. kompakt header på mobil) */
  markOnly?: boolean;
  className?: string;
};

/** Värdig logotyp — olivlåga + ordmärke i site-paletten. */
export function Logo({ markOnly = false, className = "" }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group ${className}`}
      aria-label="testimony.se — startsida"
    >
      <LogoMark className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 transition-transform group-hover:scale-[1.03]" />
      {!markOnly && (
        <span className="font-serif text-xl md:text-2xl font-semibold tracking-tight text-stone-900 leading-none">
          testimony<span className="text-olive-600">.se</span>
        </span>
      )}
    </Link>
  );
}

type MarkProps = {
  className?: string;
};

/** Fristående symbol — används i header, PWA och delning. */
export function LogoMark({ className = "h-8 w-8" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-flame-outer" x1="32" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5f7438" />
          <stop offset="0.55" stopColor="#7a8f4d" />
          <stop offset="1" stopColor="#4a5a2b" />
        </linearGradient>
        <linearGradient id="logo-flame-mid" x1="32" y1="18" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b7c58d" />
          <stop offset="0.6" stopColor="#7a8f4d" />
          <stop offset="1" stopColor="#5f7438" />
        </linearGradient>
        <radialGradient id="logo-flame-core" cx="32" cy="44" r="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f3e6b8" />
          <stop offset="0.45" stopColor="#e6c875" />
          <stop offset="1" stopColor="#c19a3e" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path
        d="M32 7.5c-1.2 5.8-4.8 10.2-8.6 14.2-4.2 4.4-8.6 8.9-8.6 16.1 0 8.2 6.6 14.8 17.2 14.8s17.2-6.6 17.2-14.8c0-7.2-4.4-11.7-8.6-16.1-3.8-4-7.4-8.4-8.6-14.2z"
        fill="url(#logo-flame-outer)"
      />
      <path
        d="M32 20c-1 3.6-3.2 6.4-5.8 9.1-2.8 2.9-5.6 5.8-5.6 10.4 0 5.6 4.6 10.2 11.4 10.2s11.4-4.6 11.4-10.2c0-4.6-2.8-7.5-5.6-10.4-2.6-2.7-4.8-5.5-5.8-9.1z"
        fill="url(#logo-flame-mid)"
      />
      <ellipse cx="32" cy="43" rx="9" ry="11" fill="url(#logo-flame-core)" />
      <path
        d="M32 24v22M24 36h16"
        stroke="#faf8f3"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

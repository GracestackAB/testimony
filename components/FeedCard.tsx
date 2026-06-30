import Link from "next/link";

type Kind = "testimony" | "prayer_request" | "prayer_answer" | "bible" | "gratitude";

interface Props {
  kind: Kind;
  title: string;
  body: string;
  href?: string;
  meta?: string;
  format?: string;
  coverImage?: string | null;
  chainSize?: number;
  kindLabels?: Partial<Record<Kind, string>>;
  chainBadge?: string;
}

const DEFAULT_KIND_LABEL: Record<Kind, string> = {
  testimony: "Vittnesbörd",
  prayer_request: "Böneämne",
  prayer_answer: "Bönesvar",
  bible: "Dagens bibeltext",
  gratitude: "Tack",
};

const KIND_COLOR: Record<Kind, string> = {
  testimony: "bg-olive-50 text-olive-700 border-olive-100",
  prayer_request: "bg-stone-50 text-stone-700 border-stone-200",
  prayer_answer: "bg-gold-300/20 text-gold-700 border-gold-300/40",
  bible: "bg-stone-100 text-stone-800 border-stone-200",
  gratitude: "bg-gold-300/10 text-gold-700 border-gold-300/30",
};

export function FeedCard({
  kind,
  title,
  body,
  href,
  meta,
  format,
  coverImage,
  chainSize,
  kindLabels,
  chainBadge,
}: Props) {
  const label = kindLabels?.[kind] ?? DEFAULT_KIND_LABEL[kind];
  const chainTitle = chainBadge?.replace("{n}", String(chainSize ?? 0));
  const content = (
    <article className="group border-b border-stone-200 pb-8 mb-8 last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${KIND_COLOR[kind]}`}>
          {label}
        </span>
        {format && format !== "skriven" && (
          <span className="text-[11px] text-stone-500 uppercase tracking-wider">· {format}</span>
        )}
        {meta && <span className="text-xs text-stone-500">· {meta}</span>}
        {chainSize && chainSize > 1 && chainBadge && (
          <span
            title={chainTitle}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-olive-700 bg-olive-50 border border-olive-200 rounded-full px-2 py-0.5"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {chainTitle}
          </span>
        )}
      </div>
      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt="" className="w-full max-h-80 object-cover rounded mb-4" />
      )}
      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-stone-900 leading-snug mb-2 group-hover:text-olive-700 transition-colors">
        {title}
      </h2>
      <p className="text-stone-700 leading-relaxed">{body}</p>
    </article>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";

type EntityHeroProps = {
  displayName: string;
  nickname?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
  heroUrl?: string | null;
  badges?: { label: string; variant?: "green" | "blue" | "default" }[];
};

export function EntityHero({
  displayName,
  nickname,
  summary,
  imageUrl,
  heroUrl,
  badges = [],
}: EntityHeroProps) {
  const visual = heroUrl || imageUrl;

  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <div className="relative aspect-square max-h-[420px] overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-[0_0_40px_var(--cp-primary-glow)]">
        {visual ? (
          <Image src={visual} alt={displayName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-cp-muted">
            No image
          </div>
        )}
      </div>
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {badges.map((b) => (
            <Badge
              key={b.label}
              className={cn(
                b.variant === "green" &&
                  "border-emerald-500/40 bg-emerald-950/60 text-emerald-200",
                b.variant === "blue" &&
                  "border-cp-primary/40 bg-cp-primary/20 text-cp-logo-accent",
                !b.variant && "border-cp-border bg-cp-elevated",
              )}
            >
              {b.label}
            </Badge>
          ))}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {displayName}
        </h1>
        {nickname ? (
          <p className="mt-1 text-lg text-cp-logo-accent">@{nickname}</p>
        ) : null}
        {summary ? (
          <div className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {/<[a-z]/i.test(summary) ? (
              <RichHtmlContent html={summary} />
            ) : (
              <p>{sanitizeRichText(summary) || summary}</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

import { statusBadgeClass } from "@/lib/styles/status-badges";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";
import { WikiImage } from "@/components/wiki/wiki-image";

type PlayerHeroBadge = {
  label: string;
  variant: "nationality" | "tier" | "default";
};

type PlayerHeroProps = {
  displayName: string;
  nickname?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
  badges?: PlayerHeroBadge[];
};

const tierStyles: Record<string, string> = {
  gold: statusBadgeClass.warning,
  silver: cn(
    "border-slate-600/25 bg-slate-500/12 text-slate-800",
    "dark:border-slate-400/40 dark:bg-slate-400/20 dark:text-slate-100",
  ),
  bronze: cn(
    "border-orange-600/25 bg-orange-500/12 text-orange-900",
    "dark:border-orange-400/40 dark:bg-orange-500/20 dark:text-orange-100",
  ),
  pro: statusBadgeClass.accent,
};

function badgeClass(variant: PlayerHeroBadge["variant"], label: string) {
  if (variant === "nationality") {
    return cn(
      "border-cp-border/80 bg-cp-elevated/80 text-foreground",
      "dark:border-white/25 dark:bg-white/15 dark:text-white",
    );
  }
  if (variant === "tier") {
    const key = label.toLowerCase().replace(/\s+tier$/, "");
    return tierStyles[key] ?? "border-cp-primary/40 bg-cp-primary/25 text-blue-100";
  }
  return "border-white/20 bg-white/10 text-white/90";
}

export function PlayerHero({
  displayName,
  nickname,
  summary,
  imageUrl,
  badges = [],
}: PlayerHeroProps) {
  const tagline = summary ? sanitizeRichText(summary) || summary : null;

  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-br from-[#1a3a6b] via-[#234878] to-[#2d5a8f]",
          "dark:from-[#0a1628] dark:via-[#0f1f3d] dark:to-[#152a4a]",
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(0,191,139,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(0,18,87,0.4),transparent_50%)]" />

      <div className="relative grid gap-5 p-5 sm:gap-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-8 lg:gap-10">
        <div className="relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:h-44 sm:w-44 md:mx-0 md:h-48 md:w-48 lg:h-52 lg:w-52">
          {imageUrl ? (
            <WikiImage
              src={imageUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 208px, 208px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white/10 text-sm text-white/60">
              No photo
            </div>
          )}
        </div>

        <div className="text-center md:text-left">
          {badges.length > 0 ? (
            <div className="mb-3 flex flex-wrap justify-center gap-2 md:justify-start">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={cn(
                    "inline-flex max-w-full items-center truncate rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                    badgeClass(b.variant, b.label),
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          ) : null}

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-5xl">
            {displayName}
          </h1>

          {nickname ? (
            <p className="mt-1 text-base font-medium text-blue-200/90 sm:text-lg">@{nickname}</p>
          ) : null}

          {tagline ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/85 sm:mt-4 sm:text-base md:mx-0">
              {tagline}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

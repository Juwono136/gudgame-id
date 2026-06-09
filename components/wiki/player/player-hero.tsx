import Image from "next/image";
import { cn } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/wiki/sanitize-rich-text";

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
  gold: "border-amber-400/50 bg-amber-500/20 text-amber-100",
  silver: "border-slate-300/40 bg-slate-400/20 text-slate-100",
  bronze: "border-orange-400/40 bg-orange-500/20 text-orange-100",
  pro: "border-cp-primary/40 bg-cp-primary/25 text-blue-100",
};

function badgeClass(variant: PlayerHeroBadge["variant"], label: string) {
  if (variant === "nationality") {
    return "border-white/25 bg-white/15 text-white";
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(0,71,255,0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_100%,rgba(0,18,87,0.4),transparent_50%)]" />

      <div className="relative grid gap-5 p-5 sm:gap-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-8 lg:gap-10">
        <div className="relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:h-44 sm:w-44 md:mx-0 md:h-48 md:w-48 lg:h-52 lg:w-52">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 208px, 208px"
              priority
              unoptimized
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

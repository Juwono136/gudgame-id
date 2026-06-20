import Image from "next/image";
import { Package, Trophy, UserRound, Users } from "lucide-react";
import type { WikiDirectoryTypeFilter } from "@/lib/wiki/directory-types";
import { cn } from "@/lib/utils";

type WikiEntityThumbnailProps = {
  imageUrl: string | null;
  entityType: WikiDirectoryTypeFilter;
  displayName: string;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
} as const;

const ICON_SIZE = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const;

const FALLBACK = {
  player: {
    icon: UserRound,
    className: "bg-cyan-500/15 text-cyan-500 dark:text-cyan-300",
  },
  gear: {
    icon: Package,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  tournament: {
    icon: Trophy,
    className: "bg-cp-primary/15 text-cp-primary",
  },
  team: {
    icon: Users,
    className: "bg-violet-500/15 text-violet-500 dark:text-violet-300",
  },
} as const;

function getFallbackInitial(displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function WikiEntityThumbnail({
  imageUrl,
  entityType,
  displayName,
  size = "sm",
  className,
}: WikiEntityThumbnailProps) {
  const fallback = FALLBACK[entityType] ?? FALLBACK.tournament;
  const Icon = fallback.icon;
  const dimension = size === "sm" ? 40 : 48;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-cp-border",
        SIZE_CLASS[size],
        className,
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          width={dimension}
          height={dimension}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : entityType === "player" ? (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center text-sm font-semibold",
            fallback.className,
          )}
          aria-hidden
        >
          {getFallbackInitial(displayName)}
        </div>
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            fallback.className,
          )}
          aria-hidden
        >
          <Icon className={ICON_SIZE[size]} />
        </div>
      )}
    </div>
  );
}

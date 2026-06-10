import Image from "next/image";
import { UserCircle } from "lucide-react";
import { resolveUserImageUrl } from "@/lib/storage/media-url";
import { cn } from "@/lib/utils";

type TournamentOrganizerProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
};

export function TournamentOrganizer({ name, imageUrl, className }: TournamentOrganizerProps) {
  const avatarSrc = resolveUserImageUrl(imageUrl);

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2.5 rounded-full border border-cp-border bg-cp-card/80 px-3 py-1.5",
        className,
      )}
    >
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-cp-border bg-cp-elevated">
        {avatarSrc ? (
          <Image src={avatarSrc} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-cp-muted">
            <UserCircle className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
          Organized by
        </p>
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
      </div>
    </div>
  );
}

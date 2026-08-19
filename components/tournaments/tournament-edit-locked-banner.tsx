import Link from "next/link";
import { Lock } from "lucide-react";

type TournamentEditLockedBannerProps = {
  status: string;
  publicHref?: string;
};

function statusCopy(status: string): string {
  if (status === "cancelled") {
    return "This tournament is cancelled. Settings are view-only and cannot be saved.";
  }
  return "This tournament is finished. Settings are view-only and cannot be saved.";
}

export function TournamentEditLockedBanner({
  status,
  publicHref,
}: TournamentEditLockedBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:px-5">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span>
          {statusCopy(status)}
          {publicHref ? (
            <>
              {" "}
              <Link href={publicHref} className="font-medium text-cp-primary hover:underline">
                Back to event page
              </Link>
            </>
          ) : null}
        </span>
      </p>
    </div>
  );
}

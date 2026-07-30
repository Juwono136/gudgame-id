import { cn } from "@/lib/utils";
import { getTournamentStatusBadgeClass } from "@/lib/styles/status-badges";

export function PartnerStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        getTournamentStatusBadgeClass(status),
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

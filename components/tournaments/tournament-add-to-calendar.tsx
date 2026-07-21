"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAppOrigin } from "@/lib/auth/urls";
import {
  buildGoogleCalendarUrl,
  buildTournamentIcs,
  downloadIcsFile,
  slugifyCalendarFilename,
  type TournamentCalendarEvent,
} from "@/lib/tournaments/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TournamentAddToCalendarProps = {
  event: TournamentCalendarEvent;
  /** Hero banner uses higher-contrast styles over cover images. */
  tone?: "default" | "hero";
  className?: string;
};

function toAbsoluteEventUrl(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${getAppOrigin()}${path}`;
}

export function TournamentAddToCalendar({
  event,
  tone = "default",
  className,
}: TournamentAddToCalendarProps) {
  if (!event.startsAt) return null;

  const normalizedEvent: TournamentCalendarEvent = {
    ...event,
    url: toAbsoluteEventUrl(event.url),
  };

  const googleUrl = buildGoogleCalendarUrl(normalizedEvent);
  const ics = buildTournamentIcs(normalizedEvent);
  if (!googleUrl && !ics) return null;

  const isHero = tone === "hero";

  const handleDownloadIcs = () => {
    if (!ics) {
      toast.error("Could not build calendar file");
      return;
    }
    downloadIcsFile(slugifyCalendarFilename(normalizedEvent.title), ics);
    toast.success("Calendar file downloaded");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={isHero ? "secondary" : "outline"}
          className={cn(
            "group h-8 gap-1.5 px-2.5 text-xs font-semibold transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-offset-2",
            isHero
              ? [
                  "border border-black/10 bg-white/90 text-foreground shadow-sm",
                  "hover:border-black/20 hover:bg-white hover:text-foreground",
                  "data-[state=open]:border-black/20 data-[state=open]:bg-white data-[state=open]:shadow-md",
                  "dark:border-white/25 dark:bg-cp-bg/75 dark:text-foreground dark:shadow-black/30",
                  "dark:hover:border-white/40 dark:hover:bg-cp-bg dark:hover:text-foreground",
                  "dark:data-[state=open]:border-white/40 dark:data-[state=open]:bg-cp-bg",
                  "focus-visible:ring-white/60 focus-visible:ring-offset-transparent",
                ]
              : [
                  "hover:border-foreground/30 hover:bg-accent",
                  "data-[state=open]:border-foreground/30 data-[state=open]:bg-accent",
                ],
            className,
          )}
        >
          <CalendarPlus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 group-data-[state=open]:scale-110" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[12rem] border-border/80 bg-popover text-popover-foreground shadow-lg"
      >
        {googleUrl ? (
          <DropdownMenuItem asChild>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer"
            >
              Google Calendar
            </a>
          </DropdownMenuItem>
        ) : null}
        {ics ? (
          <DropdownMenuItem onSelect={handleDownloadIcs} className="cursor-pointer">
            Download .ics (Apple / Outlook)
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

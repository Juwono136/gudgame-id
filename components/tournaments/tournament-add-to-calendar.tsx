"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Apple, CalendarPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAppOrigin } from "@/lib/auth/urls";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildTournamentIcs,
  openCalendarEventInApp,
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

function CalendarOptionButton({
  title,
  description,
  onClick,
  href,
  icon,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  icon: ReactNode;
}) {
  const className = cn(
    "flex w-full items-start gap-3 rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-3 text-left transition-colors",
    "hover:border-cp-primary/40 hover:bg-cp-primary/5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-primary/40",
  );

  const body = (
    <>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cp-card text-cp-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {title}
          {href ? <ExternalLink className="h-3.5 w-3.5 text-cp-muted" /> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-cp-muted">{description}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M19.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.2c-.2 1-.8 1.9-1.6 2.5v2.1h2.6c1.5-1.4 2.3-3.5 2.3-6.2z"
      />
      <path
        fill="currentColor"
        d="M12 20c2.2 0 4-0.7 5.3-2l-2.6-2.1c-.7.5-1.6.8-2.7.8-2.1 0-3.8-1.4-4.4-3.3H4.9v2.1C6.2 18.1 8.9 20 12 20z"
      />
      <path
        fill="currentColor"
        d="M7.6 13.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V8.2H4.9C4.3 9.4 4 10.7 4 12s.3 2.6.9 3.8l2.7-2.1z"
      />
      <path
        fill="currentColor"
        d="M12 6.5c1.2 0 2.2.4 3.1 1.2l2.3-2.3C15.9 3.9 14.1 3 12 3 8.9 3 6.2 4.9 4.9 8.2l2.7 2.1C8.2 7.9 9.9 6.5 12 6.5z"
      />
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4H14v16H5.5A2.5 2.5 0 0 1 3 17.5v-11z"
        opacity="0.35"
      />
      <path
        fill="currentColor"
        d="M14 4h4.5A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14V4zm-4.5 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"
      />
    </svg>
  );
}

export function TournamentAddToCalendar({
  event,
  tone = "default",
  className,
}: TournamentAddToCalendarProps) {
  const [open, setOpen] = useState(false);

  const normalizedEvent = useMemo<TournamentCalendarEvent>(
    () => ({
      ...event,
      url: toAbsoluteEventUrl(event.url),
    }),
    [event],
  );

  if (!event.startsAt) return null;

  const googleUrl = buildGoogleCalendarUrl(normalizedEvent);
  const outlookUrl = buildOutlookCalendarUrl(normalizedEvent);
  const ics = buildTournamentIcs(normalizedEvent);
  if (!googleUrl && !outlookUrl && !ics) return null;

  const isHero = tone === "hero";

  const handleApple = () => {
    if (!ics) {
      toast.error("Could not prepare calendar event");
      return;
    }
    const ok = openCalendarEventInApp(ics);
    if (ok) {
      toast.success("Opening your calendar app…");
      setOpen(false);
      return;
    }
    toast.error("Could not open calendar app", {
      description: "Try Google Calendar or Outlook instead.",
    });
  };

  return (
    <>
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
                "dark:border-white/25 dark:bg-cp-bg/75 dark:text-foreground dark:shadow-black/30",
                "dark:hover:border-white/40 dark:hover:bg-cp-bg dark:hover:text-foreground",
                "focus-visible:ring-white/60 focus-visible:ring-offset-transparent",
              ]
            : ["hover:border-foreground/30 hover:bg-accent"],
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
        Add to calendar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-cp-border bg-cp-card">
          <DialogHeader>
            <DialogTitle>Add to calendar</DialogTitle>
            <DialogDescription>
              Choose your calendar — opens in one tap. No file downloads needed for Google or
              Outlook.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5">
            {googleUrl ? (
              <CalendarOptionButton
                title="Google Calendar"
                description="Opens a new event in Google Calendar in your browser."
                href={googleUrl}
                icon={<GoogleIcon className="h-4 w-4" />}
              />
            ) : null}
            {outlookUrl ? (
              <CalendarOptionButton
                title="Outlook"
                description="Opens Outlook on the web with the event ready to save."
                href={outlookUrl}
                icon={<OutlookIcon className="h-4 w-4" />}
              />
            ) : null}
            {ics ? (
              <CalendarOptionButton
                title="Apple Calendar"
                description="Opens the event in your device calendar app when supported."
                onClick={handleApple}
                icon={<Apple className="h-4 w-4" />}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

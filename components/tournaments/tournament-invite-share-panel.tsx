"use client";

import { Copy, ExternalLink, KeyRound, Link2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TournamentInviteSharePanelProps = {
  inviteUrl: string;
  inviteCode?: string;
  invitePageUrl?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

async function copyText(text: string, label: string) {
  if (!text.trim()) {
    toast.error("Nothing to copy");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function TournamentInviteSharePanel({
  inviteUrl,
  inviteCode,
  invitePageUrl,
  title = "Share this invitation",
  description,
  compact = false,
}: TournamentInviteSharePanelProps) {
  const resolvedDescription =
    description ??
    "Send the link or code. Recipients redeem it on the tournament invite page while signed in.";

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "space-y-4 rounded-xl border border-cp-primary/20 bg-cp-primary/5 p-4 sm:p-5"
      }
    >
      {!compact ? (
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted">{resolvedDescription}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
          <Link2 className="h-3.5 w-3.5" />
          Invite link
        </Label>
        <Input readOnly value={inviteUrl} className="h-10 border-cp-border bg-cp-bg font-mono text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyText(inviteUrl, "Link")}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy link
          </Button>
          <Button asChild type="button" size="sm" variant="outline">
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open
            </a>
          </Button>
        </div>
      </div>

      {inviteCode ? (
        <div className="space-y-2">
          <Label className="inline-flex items-center gap-1.5 text-xs text-cp-muted">
            <KeyRound className="h-3.5 w-3.5" />
            Invite code
          </Label>
          <div className="rounded-xl border border-cp-border bg-cp-bg px-3 py-3 text-center sm:px-4">
            <p className="font-mono text-xl font-bold tracking-[0.25em] text-foreground sm:text-2xl">
              {inviteCode}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => void copyText(inviteCode, "Code")}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy code
          </Button>
          <p className="text-[11px] leading-relaxed text-cp-muted">
            Save this code now — for security it is only shown once. Recipients can also paste it on
            {invitePageUrl ? (
              <>
                {" "}
                <Link href={invitePageUrl} className="text-cp-primary hover:underline">
                  the invite page
                </Link>
              </>
            ) : (
              " the invite page"
            )}
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

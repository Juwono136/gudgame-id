"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Link2, Loader2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvitePreviewView } from "@/hooks/use-tournament-invites";
import { cn } from "@/lib/utils";

export type InviteAcceptMode = "link" | "code";

export function InviteAcceptShell({
  tournamentName,
  tournamentUrl,
  eyebrow,
  description,
  children,
}: {
  tournamentName: string;
  tournamentUrl: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-cp-muted hover:text-foreground"
      >
        <Link href={tournamentUrl}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to tournament
        </Link>
      </Button>

      <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">{eyebrow}</p>
        <h1 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{tournamentName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-cp-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function InviteModeTabs({
  mode,
  onModeChange,
}: {
  mode: InviteAcceptMode;
  onModeChange: (mode: InviteAcceptMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-cp-elevated/40 p-1">
      <button
        type="button"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          mode === "link" ? "bg-cp-card text-foreground shadow-sm" : "text-cp-muted",
        )}
        onClick={() => onModeChange("link")}
      >
        <Link2 className="mr-1.5 inline h-4 w-4" />
        Invite link
      </button>
      <button
        type="button"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          mode === "code" ? "bg-cp-card text-foreground shadow-sm" : "text-cp-muted",
        )}
        onClick={() => onModeChange("code")}
      >
        <KeyRound className="mr-1.5 inline h-4 w-4" />
        Invite code
      </button>
    </div>
  );
}

export function InviteConfirmCard({
  preview,
  pending,
  onAccept,
  onCancel,
}: {
  preview: InvitePreviewView;
  pending: boolean;
  onAccept: () => void;
  onCancel?: () => void;
}) {
  const isPlayer = preview.kind === "player";

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border p-4",
        isPlayer
          ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20"
          : "border-cp-primary/25 bg-cp-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        {isPlayer ? (
          <Users className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 text-cp-primary" />
        )}
        <div>
          <p className="font-semibold text-foreground">
            {isPlayer ? "Player invite" : `${preview.roleLabel ?? "Staff"} access`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted">
            {isPlayer
              ? "You will join this tournament through the lobby and choose or create a squad."
              : preview.role === "bracket_manager"
                ? "You can manage the bracket and update live scores."
                : "You can update live match scores for this tournament."}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className={cn(
            "flex-1",
            isPlayer
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-cp-primary hover:bg-cp-primary-light",
          )}
          disabled={pending}
          onClick={onAccept}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting…
            </>
          ) : (
            "Accept invitation"
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="border-cp-border" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function InviteCodeForm({
  inviteCode,
  onInviteCodeChange,
  onVerify,
  verifying,
  error,
  accent = "staff",
}: {
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
  onVerify: () => void;
  verifying: boolean;
  error?: string | null;
  accent?: "staff" | "player";
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-cp-muted">
        Enter the code exactly as shown by the host (letters and numbers, no spaces).
      </p>
      <div className="space-y-2">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          value={inviteCode}
          onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder="Paste code here"
          className="h-12 border-cp-border bg-cp-bg-input text-center font-mono text-lg uppercase tracking-[0.3em]"
          autoComplete="off"
          inputMode="text"
        />
      </div>
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}
      <Button
        type="button"
        className={cn(
          "h-11 w-full",
          accent === "player"
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-cp-primary hover:bg-cp-primary-light",
        )}
        disabled={verifying || inviteCode.trim().length < 4}
        onClick={onVerify}
      >
        {verifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying code…
          </>
        ) : (
          "Verify code"
        )}
      </Button>
    </div>
  );
}

export function InviteLinkPanel({
  hasToken,
  loading,
  error,
  errorAction,
  children,
}: {
  hasToken: boolean;
  loading: boolean;
  error: string | null;
  errorAction?: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!hasToken) {
    return (
      <div className="rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
        Open the full invite link sent by your host. It will bring you back here to confirm before
        access is granted.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-7 w-7 animate-spin text-cp-primary" />
        <p className="text-sm text-cp-muted">Checking invitation…</p>
      </div>
    );
  }

  if (error) {
    const isHost = error.toLowerCase().includes("you are the organizer");
    return (
      <div
        className={cn(
          "rounded-xl border px-4 py-4 text-sm",
          isHost
            ? "border-amber-500/40 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100"
            : "border-red-500/40 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200",
        )}
      >
        <p>{error}</p>
        {errorAction}
      </div>
    );
  }

  return <>{children}</>;
}

export function InviteSignInGate({
  tournamentName,
  loginHref,
  tournamentUrl,
}: {
  tournamentName: string;
  loginHref: string;
  tournamentUrl: string;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">Sign in to continue</h1>
      <p className="mt-2 text-sm text-cp-muted">
        Sign in to accept this invitation for{" "}
        <span className="font-medium text-foreground">{tournamentName}</span>.
      </p>
      <Button asChild className="mt-6">
        <Link href={loginHref}>Sign in</Link>
      </Button>
      <Button asChild variant="ghost" className="mt-3 w-full">
        <Link href={tournamentUrl}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to tournament
        </Link>
      </Button>
    </div>
  );
}

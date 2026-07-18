"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Link2, Loader2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { usePreviewInvite, useRedeemInvite, type InvitePreviewView } from "@/hooks/use-tournament-invites";
import { isOfficialType } from "@/lib/tournaments/core/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TournamentInviteClientProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  tournamentName: string;
  tournamentType?: string;
};

type InviteMode = "link" | "code";

function InviteConfirmCard({
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
  return (
    <div className="space-y-4 rounded-xl border border-cp-primary/25 bg-cp-primary/5 p-4">
      <div className="flex items-start gap-3">
        {preview.kind === "player" ? (
          <Users className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 text-cp-primary" />
        )}
        <div>
          <p className="font-semibold text-foreground">
            {preview.kind === "player"
              ? "Player invite"
              : `${preview.roleLabel ?? "Staff"} access`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-cp-muted">
            {preview.kind === "player"
              ? "You will join this Fun Match through the lobby and choose or create a squad."
              : preview.role === "bracket_manager"
                ? "You can manage the bracket and update live scores."
                : "You can update live match scores for this tournament."}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 bg-cp-primary hover:bg-cp-primary-light"
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

export function TournamentInviteClient({
  sportSlug,
  slug,
  tournamentId,
  tournamentName,
  tournamentType,
}: TournamentInviteClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const kindParam = searchParams.get("kind");
  const isOfficial = isOfficialType(tournamentType);
  const allowPlayerInvites = !isOfficial;
  const initialKind = (
    kindParam === "player" && allowPlayerInvites ? "player" : "access"
  ) as "player" | "access";

  const previewInvite = usePreviewInvite();
  const redeem = useRedeemInvite();
  const [needsAuth, setNeedsAuth] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteKind, setInviteKind] = useState<"player" | "access">(initialKind);
  const [mode, setMode] = useState<InviteMode>(token ? "link" : "code");
  const [linkPreview, setLinkPreview] = useState<InvitePreviewView | null>(null);
  const [linkPreviewError, setLinkPreviewError] = useState<string | null>(null);
  const [codePreview, setCodePreview] = useState<InvitePreviewView | null>(null);
  const [codePreviewError, setCodePreviewError] = useState<string | null>(null);

  const tournamentUrl = publicSportRoutes.tournament(sportSlug, slug);
  const invitePageUrl = publicSportRoutes.tournamentInvite(sportSlug, slug);
  const callbackUrl = token
    ? `${invitePageUrl}?token=${encodeURIComponent(token)}&kind=${initialKind}`
    : invitePageUrl;
  const loginHref = `${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    if (!token) return;

    previewInvite.mutate(
      { token, tournamentId, kind: initialKind },
      {
        onSuccess: (preview) => setLinkPreview(preview),
        onError: (err: Error) => {
          if (err.message.toLowerCase().includes("unauthorized")) {
            setNeedsAuth(true);
            return;
          }
          setLinkPreviewError(err.message);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tournamentId, initialKind]);

  const redirectAfterRedeem = (resolvedKind: "player" | "access") => {
    const base = publicSportRoutes.tournament(sportSlug, slug);
    router.replace(
      resolvedKind === "player" ? `${base}?join=1&tab=Lobby` : publicSportRoutes.tournamentManage(sportSlug, slug),
    );
  };

  const handleRedeem = (input: {
    token?: string;
    code?: string;
    kind: "player" | "access";
  }) => {
    redeem.mutate(
      { ...input, tournamentId },
      {
        onSuccess: () => {
          toast.success(
            input.kind === "player"
              ? "Invite accepted — opening lobby"
              : "Staff access granted",
          );
          redirectAfterRedeem(input.kind);
        },
        onError: (err: Error) => {
          if (err.message.toLowerCase().includes("unauthorized")) {
            setNeedsAuth(true);
            return;
          }
          toast.error(err.message);
        },
      },
    );
  };

  const handleCodeVerify = () => {
    const code = inviteCode.trim();
    if (code.length < 4) {
      toast.error("Enter the full invite code from your host");
      return;
    }
    setCodePreview(null);
    setCodePreviewError(null);
    previewInvite.mutate(
      { code, tournamentId, kind: inviteKind },
      {
        onSuccess: (preview) => setCodePreview(preview),
        onError: (err: Error) => {
          if (err.message.toLowerCase().includes("unauthorized")) {
            setNeedsAuth(true);
            return;
          }
          setCodePreviewError(err.message);
        },
      },
    );
  };

  if (needsAuth) {
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

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-cp-muted hover:text-foreground">
        <Link href={tournamentUrl}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to tournament
        </Link>
      </Button>

      <div className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-cp-primary">Invitation</p>
        <h1 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{tournamentName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-cp-muted">
          {isOfficial
            ? "Accept staff access for this official tournament. You must be signed in."
            : "Accept a staff or player invite. You must be signed in."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-cp-elevated/40 p-1">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "link" ? "bg-cp-card text-foreground shadow-sm" : "text-cp-muted",
            )}
            onClick={() => setMode("link")}
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
            onClick={() => setMode("code")}
          >
            <KeyRound className="mr-1.5 inline h-4 w-4" />
            Invite code
          </button>
        </div>

        {mode === "link" ? (
          <div className="mt-5 space-y-4">
            {!token ? (
              <div className="rounded-xl border border-dashed border-cp-border px-4 py-6 text-center text-sm text-cp-muted">
                Open the full invite link sent by your host. It will bring you back here to confirm
                before access is granted.
              </div>
            ) : previewInvite.isPending ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-7 w-7 animate-spin text-cp-primary" />
                <p className="text-sm text-cp-muted">Checking invitation…</p>
              </div>
            ) : linkPreviewError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-50 px-4 py-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
                {linkPreviewError}
              </div>
            ) : linkPreview ? (
              <InviteConfirmCard
                preview={linkPreview}
                pending={redeem.isPending}
                onAccept={() => handleRedeem({ token, kind: linkPreview.kind })}
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-cp-muted">
              Enter the code exactly as shown by the host (letters and numbers, no spaces).
            </p>

            {allowPlayerInvites ? (
              <div className="space-y-2">
                <Label htmlFor="invite-kind">What type of invite is this?</Label>
                <Select
                  value={inviteKind}
                  onValueChange={(v) => {
                    setInviteKind(v as "player" | "access");
                    setCodePreview(null);
                    setCodePreviewError(null);
                  }}
                >
                  <SelectTrigger id="invite-kind" className="h-11 border-cp-border bg-cp-bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player — join Fun Match lobby</SelectItem>
                    <SelectItem value="access">Staff — scorekeeper or bracket manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-lg border border-cp-border/70 bg-cp-elevated/20 px-3 py-2 text-xs text-cp-muted">
                Official tournaments only use staff invites (scorekeeper or bracket manager).
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                  setCodePreview(null);
                  setCodePreviewError(null);
                }}
                placeholder="Paste code here"
                className="h-12 border-cp-border bg-cp-bg-input text-center font-mono text-lg uppercase tracking-[0.3em]"
                autoComplete="off"
                inputMode="text"
              />
            </div>

            {codePreviewError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
                {codePreviewError}
              </div>
            ) : null}

            {codePreview ? (
              <InviteConfirmCard
                preview={codePreview}
                pending={redeem.isPending}
                onAccept={() =>
                  handleRedeem({ code: inviteCode.trim(), kind: codePreview.kind })
                }
                onCancel={() => setCodePreview(null)}
              />
            ) : (
              <Button
                type="button"
                className="h-11 w-full bg-cp-primary hover:bg-cp-primary-light"
                disabled={previewInvite.isPending || inviteCode.trim().length < 4}
                onClick={handleCodeVerify}
              >
                {previewInvite.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying code…
                  </>
                ) : (
                  "Verify code"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

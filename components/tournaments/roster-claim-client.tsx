"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, LogIn, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type ClaimPreview = {
  displayName: string;
  email: string;
  teamName: string;
  tournamentName: string;
  sportSlug: string;
  tournamentSlug: string;
  expiresAt: string | null;
  expired: boolean;
  alreadyClaimed: boolean;
};

type Props = {
  sportSlug: string;
  slug: string;
  token: string;
  isAuthenticated: boolean;
  sessionEmail: string | null;
};

export function RosterClaimClient({
  sportSlug,
  slug,
  token,
  isAuthenticated,
  sessionEmail,
}: Props) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournamentHref = publicSportRoutes.tournament(sportSlug, slug);
  const loginHref = `${authRoutes.login}?callbackUrl=${encodeURIComponent(
    `${publicSportRoutes.tournamentClaim(sportSlug, slug)}?token=${encodeURIComponent(token)}`,
  )}`;
  const registerHref = `${authRoutes.register}?callbackUrl=${encodeURIComponent(
    `${publicSportRoutes.tournamentClaim(sportSlug, slug)}?token=${encodeURIComponent(token)}`,
  )}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${sportSlug}/${slug}/claim?token=${encodeURIComponent(token)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Invalid invite");
        if (!cancelled) {
          setPreview(json.data as ClaimPreview);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Invalid invite");
          setPreview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sportSlug, slug, token]);

  const emailMatches =
    Boolean(sessionEmail) &&
    Boolean(preview?.email) &&
    sessionEmail!.trim().toLowerCase() === preview!.email.trim().toLowerCase();

  const handleClaim = async () => {
    if (!preview) return;
    const ok = await confirm({
      title: "Claim this roster slot?",
      description: `Join team "${preview.teamName}" for ${preview.tournamentName}. Match results will count toward your Gud Game career stats after claim.`,
      confirmLabel: "Claim my spot",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setClaiming(true);
    try {
      const res = await fetch(`/api/tournaments/${sportSlug}/${slug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not claim slot");
      toast.success("Spot claimed — welcome to the team!");
      router.push(tournamentHref);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim slot");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <LoadingOverlay show={claiming} label="Claiming your spot…" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card/50 p-6 sm:p-8"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Roster claim
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Claim your tournament spot
        </h1>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking invite…
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Invite unavailable</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={tournamentHref}>Back to tournament</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {preview && !loading ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
              <p className="text-muted-foreground">Tournament</p>
              <p className="font-medium text-foreground">{preview.tournamentName}</p>
              <p className="mt-3 text-muted-foreground">Team</p>
              <p className="font-medium text-foreground">{preview.teamName}</p>
              <p className="mt-3 text-muted-foreground">Invited as</p>
              <p className="font-medium text-foreground">{preview.displayName}</p>
              <p className="text-xs text-muted-foreground">{preview.email}</p>
            </div>

            {preview.alreadyClaimed ? (
              <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">Already claimed</p>
                  <p className="mt-1 text-muted-foreground">
                    This slot is linked to a Gud Game account.
                  </p>
                  <Button asChild className="mt-3">
                    <Link href={tournamentHref}>View tournament</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {preview.expired && !preview.alreadyClaimed ? (
              <p className="text-sm text-destructive">
                This invite has expired. Ask your captain to invite you again.
              </p>
            ) : null}

            {!preview.alreadyClaimed && !preview.expired ? (
              <>
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign in or create an account with <strong>{preview.email}</strong> to claim
                      this spot.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link href={loginHref}>
                          <LogIn className="size-4" />
                          Sign in
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={registerHref}>Create account</Link>
                      </Button>
                    </div>
                  </div>
                ) : !emailMatches ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                    <p className="font-medium text-foreground">Wrong account email</p>
                    <p className="mt-1 text-muted-foreground">
                      You are signed in as <strong>{sessionEmail}</strong>, but this invite is for{" "}
                      <strong>{preview.email}</strong>. Sign out and use the invited email.
                    </p>
                    <Button asChild variant="outline" className="mt-3">
                      <Link href={loginHref}>Switch account</Link>
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={claiming}
                    onClick={() => void handleClaim()}
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Claiming…
                      </>
                    ) : (
                      "Claim my spot"
                    )}
                  </Button>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

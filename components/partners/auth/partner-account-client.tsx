"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartnerAuthShell } from "@/components/partners/auth/partner-auth-shell";
import { partnerAuthRoutes } from "@/lib/partners/auth/urls";
import { emitPartnerPlayerAuthEvent } from "@/lib/partners/auth/client-events";

type Props = {
  partnerSlug: string;
  partnerName: string;
  logoUrl: string | null;
  primaryColor: string;
  session: {
    displayName: string;
    email: string;
    emailVerified: boolean;
    playerId: string | null;
  };
};

export function PartnerAccountClient({
  partnerSlug,
  partnerName,
  logoUrl,
  primaryColor,
  session,
}: Props) {
  const router = useRouter();
  const routes = partnerAuthRoutes(partnerSlug);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`/api/partner/public/${partnerSlug}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Signed out");
      setConfirmOpen(false);
      emitPartnerPlayerAuthEvent(partnerSlug, "logout");
      router.push(routes.home);
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <PartnerAuthShell
        partnerSlug={partnerSlug}
        partnerName={partnerName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        formTitle="My account"
        formSubtitle={`Your ${partnerName} member profile (separate from Gud Game).${
          session.playerId
            ? " Tournament and league results sync to your player stats."
            : ""
        }`}
        footer={
          <Link href={routes.home} className="font-semibold text-cp-primary hover:underline">
            Back to home
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-cp-border/70 bg-cp-elevated/30 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cp-primary/15 text-cp-primary">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {session.displayName}
              </p>
              <p className="truncate text-sm text-cp-muted">{session.email}</p>
              <p className="mt-1 text-[11px] text-cp-muted">
                {session.emailVerified ? "Email verified" : "Email not verified"}
                {session.playerId ? " · Player profile linked" : ""}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </PartnerAuthShell>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to access your {partnerName} member
              account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              {loggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

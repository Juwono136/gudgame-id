"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authRoutes, publicSportRoutes } from "@/lib/constants/routes";
import {
  usePreviewInvite,
  useRedeemInvite,
  type InvitePreviewView,
} from "@/hooks/use-tournament-invites";
import { toast } from "sonner";
import {
  InviteAcceptShell,
  InviteCodeForm,
  InviteConfirmCard,
  InviteLinkPanel,
  InviteModeTabs,
  InviteSignInGate,
  type InviteAcceptMode,
} from "@/components/tournaments/invite/invite-accept-shared";

type StaffInviteAcceptClientProps = {
  sportSlug: string;
  slug: string;
  tournamentId: string;
  tournamentName: string;
};

export function StaffInviteAcceptClient({
  sportSlug,
  slug,
  tournamentId,
  tournamentName,
}: StaffInviteAcceptClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;

  const previewInvite = usePreviewInvite();
  const redeem = useRedeemInvite();
  const [needsAuth, setNeedsAuth] = useState(false);
  const [mode, setMode] = useState<InviteAcceptMode>(token ? "link" : "code");
  const [inviteCode, setInviteCode] = useState("");
  const [linkPreview, setLinkPreview] = useState<InvitePreviewView | null>(null);
  const [linkPreviewError, setLinkPreviewError] = useState<string | null>(null);
  const [codePreview, setCodePreview] = useState<InvitePreviewView | null>(null);
  const [codePreviewError, setCodePreviewError] = useState<string | null>(null);

  const tournamentUrl = publicSportRoutes.tournament(sportSlug, slug);
  const manageUrl = publicSportRoutes.tournamentManage(sportSlug, slug);
  const invitePageUrl = publicSportRoutes.tournamentInvite(sportSlug, slug);
  const callbackUrl = token
    ? `${invitePageUrl}?token=${encodeURIComponent(token)}&kind=access`
    : `${invitePageUrl}?kind=access`;
  const loginHref = `${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    if (!token) return;
    previewInvite.mutate(
      { token, tournamentId, kind: "access" },
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
  }, [token, tournamentId]);

  const handleRedeem = (input: { token?: string; code?: string }) => {
    redeem.mutate(
      { ...input, tournamentId, kind: "access" },
      {
        onSuccess: () => {
          toast.success("Staff access granted");
          router.replace(manageUrl);
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
      toast.error("Enter the full staff invite code from your host");
      return;
    }
    setCodePreview(null);
    setCodePreviewError(null);
    previewInvite.mutate(
      { code, tournamentId, kind: "access" },
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
      <InviteSignInGate
        tournamentName={tournamentName}
        loginHref={loginHref}
        tournamentUrl={tournamentUrl}
      />
    );
  }

  const hostAction = (message: string | null) =>
    message?.toLowerCase().includes("you are the organizer") ? (
      <Button asChild size="sm" className="mt-3 bg-cp-primary hover:bg-cp-primary-light">
        <Link href={manageUrl}>Open manage tournament</Link>
      </Button>
    ) : null;

  return (
    <InviteAcceptShell
      tournamentName={tournamentName}
      tournamentUrl={tournamentUrl}
      eyebrow="Staff invitation"
      description="Accept staff access (scorekeeper or bracket manager). You must be signed in."
    >
      <InviteModeTabs mode={mode} onModeChange={setMode} />

      <div className="mt-5">
        {mode === "link" ? (
          <InviteLinkPanel
            hasToken={Boolean(token)}
            loading={Boolean(token) && previewInvite.isPending && !linkPreview && !linkPreviewError}
            error={linkPreviewError}
            errorAction={hostAction(linkPreviewError)}
          >
            {linkPreview ? (
              <InviteConfirmCard
                preview={linkPreview}
                pending={redeem.isPending}
                onAccept={() => handleRedeem({ token })}
              />
            ) : null}
          </InviteLinkPanel>
        ) : codePreview ? (
          <InviteConfirmCard
            preview={codePreview}
            pending={redeem.isPending}
            onAccept={() => handleRedeem({ code: inviteCode.trim() })}
            onCancel={() => setCodePreview(null)}
          />
        ) : (
          <InviteCodeForm
            inviteCode={inviteCode}
            onInviteCodeChange={(value) => {
              setInviteCode(value);
              setCodePreview(null);
              setCodePreviewError(null);
            }}
            onVerify={handleCodeVerify}
            verifying={previewInvite.isPending}
            error={codePreviewError}
            accent="staff"
          />
        )}
      </div>
    </InviteAcceptShell>
  );
}

"use client";

import { CheckCircle2, CreditCard, Loader2, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import {
  isActiveRegistrationStatus,
  registrationCheckoutUrl,
  registrationConfirmUrl,
} from "@/lib/tournaments/registration/urls";
import { RegistrationActionIconButton } from "@/components/tournaments/registration-action-icon-button";
import { cn } from "@/lib/utils";

type OfficialRegistrationManageActionsProps = {
  registrationId: string;
  sportSlug: string;
  slug: string;
  teamName?: string | null;
  registrationStatus: string;
  /** compact = icon row for tables; stacked = sidebar layout */
  layout?: "compact" | "stacked";
  className?: string;
  onEditTeam?: () => void;
  onCancelled?: () => void;
  redirectOnCancel?: string;
};

export function OfficialRegistrationManageActions({
  registrationId,
  sportSlug,
  slug,
  teamName,
  registrationStatus,
  layout = "compact",
  className,
  onEditTeam,
  onCancelled,
  redirectOnCancel,
}: OfficialRegistrationManageActionsProps) {
  const { cancelRegistration, isPending } = useCancelRegistration();

  if (!isActiveRegistrationStatus(registrationStatus)) return null;

  const confirmHref = registrationConfirmUrl(sportSlug, slug, registrationId);
  const checkoutHref = registrationCheckoutUrl(sportSlug, slug, registrationId);
  const isAwaiting = registrationStatus === "awaiting_confirmation";
  const isPendingPayment = registrationStatus === "pending_payment";

  const handleCancel = async () => {
    const ok = await cancelRegistration({
      registrationId,
      sportSlug,
      slug,
      teamName,
      redirectTo: redirectOnCancel,
    });
    if (ok) onCancelled?.();
  };

  if (layout === "stacked") {
    return (
      <div className={cn("mt-3 space-y-2 border-t border-cp-border pt-3", className)}>
        {isAwaiting ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-cp-border"
            onClick={onEditTeam}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit team
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
          disabled={isPending}
          onClick={() => void handleCancel()}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Cancel registration
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex flex-wrap items-center justify-end gap-1", className)}
      role="group"
      aria-label="Registration actions"
    >
      {isAwaiting ? (
        <>
          <RegistrationActionIconButton
            icon={Pencil}
            label="Edit team"
            onClick={onEditTeam}
          />
          <RegistrationActionIconButton
            icon={CheckCircle2}
            label="Confirm participation"
            href={confirmHref}
          />
        </>
      ) : null}
      {isPendingPayment ? (
        <RegistrationActionIconButton
          icon={CreditCard}
          label="Continue to checkout"
          href={checkoutHref}
          variant="default"
        />
      ) : null}
      <RegistrationActionIconButton
        icon={XCircle}
        label="Cancel registration"
        onClick={() => void handleCancel()}
        loading={isPending}
        variant="danger"
      />
    </div>
  );
}

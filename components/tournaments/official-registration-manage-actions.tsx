"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Pencil,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCancelRegistration } from "@/hooks/use-cancel-registration";
import {
  isActiveRegistrationStatus,
  registrationCheckoutUrl,
  registrationConfirmUrl,
} from "@/lib/tournaments/registration/urls";
import { cn } from "@/lib/utils";

type OfficialRegistrationManageActionsProps = {
  registrationId: number;
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
    <div className={cn("flex flex-wrap justify-end gap-1", className)}>
      {isAwaiting ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-cp-border px-2 text-xs"
            title="Edit team"
            onClick={onEditTeam}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 border-cp-border px-2 text-xs"
          >
            <Link href={confirmHref} title="Confirm participation">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Confirm
            </Link>
          </Button>
        </>
      ) : null}
      {isPendingPayment ? (
        <Button asChild size="sm" className="h-8 bg-cp-primary px-2 text-xs">
          <Link href={checkoutHref} title="Continue to checkout">
            <CreditCard className="mr-1 h-3.5 w-3.5" />
            Pay
          </Link>
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs text-red-400 hover:text-red-300"
        title="Cancel registration"
        disabled={isPending}
        onClick={() => void handleCancel()}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        <span className="ml-1 hidden sm:inline">Cancel</span>
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import {
  useCancelHostRoleRequest,
  useCreateHostRoleRequest,
  useHostRoleRequestState,
} from "@/hooks/use-host-role-request";
import { dashboardRoutes } from "@/lib/constants/routes";
import { formatAppDateTime } from "@/lib/datetime/format-app";
import { ROLE_DESCRIPTIONS } from "@/lib/roles/constants";
import { HOST_ROLE_REQUEST_MESSAGE_MAX } from "@/lib/host-role-requests/constants";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

export function HostRoleRequestCard() {
  const { confirm } = useConfirmDialog();
  const { data, isLoading, isError, isFetching, refetch } = useHostRoleRequestState();
  const createMutation = useCreateHostRoleRequest();
  const cancelMutation = useCancelHostRoleRequest();
  const [message, setMessage] = useState("");

  // Keep Roles tab fresh while a decision is still outstanding.
  useEffect(() => {
    if (data?.request?.status !== "pending" || data.hasHostRole) return;
    const id = window.setInterval(() => {
      void refetch();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [data?.hasHostRole, data?.request?.status, refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-2xl border border-cp-border bg-cp-card py-10">
        <Loader2 className="h-6 w-6 animate-spin text-cp-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-cp-border bg-cp-card p-5 text-center sm:p-6">
        <p className="text-sm text-cp-muted">Could not load Host role request status.</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const request = data.request;
  const pending = request?.status === "pending" ? request : null;
  const rejected = request?.status === "rejected" ? request : null;
  const revoked = request?.status === "revoked" ? request : null;
  const cancelled = request?.status === "cancelled" ? request : null;
  const approved = request?.status === "approved" ? request : null;
  const busy = createMutation.isPending || cancelMutation.isPending;

  const submit = async () => {
    const ok = await confirm({
      title: "Request Host role?",
      description:
        "Your request will be sent to super admins for review. You will be notified by email and in the app when it is approved or declined.",
      confirmLabel: "Submit request",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    try {
      await createMutation.mutateAsync(message.trim());
      setMessage("");
      toast.success("Host role request submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: "Cancel pending request?",
      description: "You can submit a new Host role request later.",
      confirmLabel: "Cancel request",
      cancelLabel: "Keep pending",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await cancelMutation.mutateAsync();
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel request");
    }
  };

  if (data.hasHostRole) {
    return (
      <section
        id="roles"
        className="rounded-2xl border border-cp-primary/25 bg-cp-primary/5 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/15 text-cp-primary">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Host access granted</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-cp-muted"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-cp-muted">
              You have the Host role. {ROLE_DESCRIPTIONS.host}
            </p>
            {approved?.reviewedAt ? (
              <p className="mt-2 text-xs text-cp-muted">
                Approved {formatAppDateTime(approved.reviewedAt)}
              </p>
            ) : null}
            <Button asChild className="mt-4 bg-cp-primary hover:bg-cp-primary-light">
              <Link href={dashboardRoutes.host}>Open Host dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Edge: request marked approved but role not visible yet — prompt refresh.
  if (approved) {
    return (
      <section
        id="roles"
        className="rounded-2xl border border-cp-primary/25 bg-cp-primary/5 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/15 text-cp-primary">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Host request approved</h2>
            <p className="mt-1 text-sm leading-relaxed text-cp-muted">
              A super admin approved your request. Refresh to load your Host access, or sign out and
              back in if it does not appear.
            </p>
            {approved.reviewedAt ? (
              <p className="mt-2 text-xs text-cp-muted">
                Approved {formatAppDateTime(approved.reviewedAt)}
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-4 bg-cp-primary hover:bg-cp-primary-light"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh status
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="roles"
      className="relative space-y-4 rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6"
    >
      <LoadingOverlay show={busy} label="Updating request…" />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cp-primary/12 text-cp-primary">
          <ShieldPlus className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Request Host role</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-cp-muted"
              disabled={isFetching || busy}
              onClick={() => void refetch()}
              aria-label="Refresh Host role status"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-cp-muted">
            Hosts can manage tournaments and related host tools. Super admins review every request
            before access is granted. This status updates automatically when a decision is made.
          </p>
        </div>
      </div>

      {pending ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Request pending review</p>
              <p className="mt-1 text-xs text-cp-muted">
                Submitted {formatAppDateTime(pending.createdAt)}. Status refreshes automatically while
                you wait — you will also get an email and in-app notification.
              </p>
              {pending.message ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-cp-muted">
                  Your message: {pending.message}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={() => void cancel()}
              >
                Cancel request
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {revoked ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-2">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Host access was revoked</p>
                  <p className="mt-1 text-sm text-cp-muted">
                    {revoked.rejectionReason ||
                      "An administrator removed your Host role. You can submit a new request below."}
                  </p>
                  {revoked.reviewedAt ? (
                    <p className="mt-2 text-xs text-cp-muted">
                      Revoked {formatAppDateTime(revoked.reviewedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {rejected ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Previous request declined</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-cp-muted">
                    {rejected.rejectionReason || "No reason provided."}
                  </p>
                  {rejected.reviewedAt ? (
                    <p className="mt-2 text-xs text-cp-muted">
                      Declined {formatAppDateTime(rejected.reviewedAt)}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-cp-muted">
                      You can submit a new request below if needed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {cancelled && !revoked && !rejected ? (
            <div className="rounded-xl border border-cp-border bg-cp-elevated/50 p-4">
              <p className="text-sm font-semibold text-foreground">Previous request cancelled</p>
              <p className="mt-1 text-xs text-cp-muted">
                Cancelled {formatAppDateTime(cancelled.updatedAt)}. You can submit a new request
                below.
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="host-role-message">Message to super admin (optional)</Label>
            <Textarea
              id="host-role-message"
              value={message}
              maxLength={HOST_ROLE_REQUEST_MESSAGE_MAX}
              rows={4}
              disabled={busy}
              placeholder="Briefly explain why you need Host access…"
              onChange={(e) => setMessage(e.target.value)}
            />
            <FieldCharCounter current={message.length} max={HOST_ROLE_REQUEST_MESSAGE_MAX} />
          </div>

          <Button
            type="button"
            className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
            disabled={busy}
            onClick={() => void submit()}
          >
            Submit Host role request
          </Button>
        </>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Search,
  ShieldOff,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminLoadingOverlay } from "@/components/admin/ui/admin-loading-overlay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminHostRoleRequests,
  useApproveHostRoleRequest,
  useRejectHostRoleRequest,
  type AdminHostRoleRequestItem,
} from "@/hooks/use-host-role-request";
import type { AdminSessionContext } from "@/lib/admin/types";
import { adminRoutes } from "@/lib/constants/routes";
import { formatAppDateTime } from "@/lib/datetime/format-app";
import {
  HOST_ROLE_REJECTION_REASON_MAX,
  HOST_ROLE_REJECTION_REASON_MIN,
  type HostRoleRequestStatus,
} from "@/lib/host-role-requests/constants";
import { resolveUserImageUrl } from "@/lib/media/client";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";

const STATUS_TABS: Array<{ id: HostRoleRequestStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
  { id: "revoked", label: "Revoked" },
];

const PAGE_SIZE = 10;

type HostRoleRequestsPageProps = {
  context: AdminSessionContext;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function StatusBadge({ status }: { status: HostRoleRequestStatus }) {
  if (status === "pending") {
    return (
      <Badge variant="warning">
        <Clock3 className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="danger">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    );
  }
  if (status === "revoked") {
    return (
      <Badge variant="danger">
        <Ban className="mr-1 h-3 w-3" />
        Revoked
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      <ShieldOff className="mr-1 h-3 w-3" />
      Cancelled
    </Badge>
  );
}

export function HostRoleRequestsPage({ context }: HostRoleRequestsPageProps) {
  const { confirm } = useConfirmDialog();
  const [status, setStatus] = useState<HostRoleRequestStatus>("pending");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<AdminHostRoleRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  const query = useAdminHostRoleRequests({
    status,
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  const approveMutation = useApproveHostRoleRequest();
  const rejectMutation = useRejectHostRoleRequest();
  const busy = approveMutation.isPending || rejectMutation.isPending;

  const items = query.data?.items ?? [];
  const statusCounts = query.data?.statusCounts;
  const pendingCount = query.data?.pendingCount ?? statusCounts?.pending ?? 0;

  const emptyCopy = useMemo(() => {
    if (debouncedSearch.trim()) {
      return `No ${status} requests match “${debouncedSearch.trim()}”.`;
    }
    if (status === "pending") return "No pending Host role requests.";
    return `No ${status} requests found.`;
  }, [debouncedSearch, status]);

  const approve = async (item: AdminHostRoleRequestItem) => {
    const ok = await confirm({
      title: "Approve Host role?",
      description: `${item.userName} (${item.userEmail}) will receive the Host role — the same outcome as enabling Host in User Management. They can open the Host dashboard immediately.`,
      confirmLabel: "Approve & grant Host",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    try {
      await approveMutation.mutateAsync(item.id);
      toast.success(`Host role granted to ${item.userName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectionReason.trim();
    if (reason.length < HOST_ROLE_REJECTION_REASON_MIN) {
      toast.error(`Please provide at least ${HOST_ROLE_REJECTION_REASON_MIN} characters.`);
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: rejectTarget.id,
        rejectionReason: reason,
      });
      toast.success("Request declined — user notified");
      setRejectTarget(null);
      setRejectionReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };

  return (
    <AdminShell
      context={context}
      title="Host requests"
      breadcrumbs={[
        { label: "Dashboard", href: adminRoutes.home },
        { label: "Host requests" },
      ]}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="space-y-6"
      >
        <p className="text-sm leading-relaxed text-cp-muted">
          Review user requests for Host access. Approving grants the Host role (synced with User
          Management). Removing Host later marks the request as Revoked. Declining requires a reason
          emailed to the user. Times shown in WIB (Asia/Jakarta).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Pending"
            value={query.isLoading ? "…" : (statusCounts?.pending ?? pendingCount)}
            hint="Awaiting review"
            icon={Clock3}
          />
          <StatCard
            label="Approved"
            value={query.isLoading ? "…" : (statusCounts?.approved ?? "—")}
            hint="Host role granted"
            icon={CheckCircle2}
          />
          <StatCard
            label="Rejected"
            value={query.isLoading ? "…" : (statusCounts?.rejected ?? "—")}
            hint="Declined with reason"
            icon={XCircle}
          />
          <StatCard
            label="Cancelled"
            value={query.isLoading ? "…" : (statusCounts?.cancelled ?? "—")}
            hint="Withdrawn by user"
            icon={ShieldOff}
          />
          <StatCard
            label="Revoked"
            value={query.isLoading ? "…" : (statusCounts?.revoked ?? "—")}
            hint="Host removed in User Management"
            icon={Ban}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card/40 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:w-auto sm:self-center">
              Status
            </span>
            {STATUS_TABS.map((tab) => {
              const count = statusCounts?.[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200",
                    status === tab.id
                      ? "border-cp-primary bg-cp-primary/15 text-cp-logo-accent"
                      : "border-cp-border text-cp-muted hover:border-cp-primary/30 hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {count != null ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or message…"
              className="h-9 border-cp-border bg-cp-elevated pl-9"
              aria-label="Search host role requests"
            />
            {query.isFetching && !query.isLoading ? (
              <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-cp-muted" />
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
          {query.isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-cp-primary" />
            </div>
          ) : query.isError ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-cp-muted">Could not load Host role requests.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-cp-border bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Message</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Submitted</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-14 text-center text-cp-muted">
                          {emptyCopy}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-cp-border/80 last:border-0 hover:bg-cp-elevated/30"
                        >
                          <td className="px-4 py-3.5 align-top">
                            <div className="flex min-w-0 items-start gap-3">
                              <Avatar className="h-9 w-9 shrink-0 border border-cp-border">
                                <AvatarImage
                                  src={resolveUserImageUrl(item.userImage) ?? undefined}
                                  alt={item.userName}
                                />
                                <AvatarFallback className="bg-cp-primary/10 text-xs font-semibold text-cp-primary">
                                  {initials(item.userName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {item.userName}
                                </p>
                                <p className="truncate text-xs text-cp-muted">{item.userEmail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-[20rem] px-4 py-3.5 align-top">
                            {item.message ? (
                              <p className="line-clamp-3 whitespace-pre-wrap text-cp-muted">
                                {item.message}
                              </p>
                            ) : (
                              <p className="italic text-cp-muted">No message</p>
                            )}
                            {(item.status === "rejected" || item.status === "revoked") &&
                            item.rejectionReason ? (
                              <p className="mt-2 line-clamp-2 rounded-lg border border-red-500/25 bg-red-500/10 px-2 py-1.5 text-xs text-foreground">
                                {item.status === "revoked" ? "Note" : "Reason"}:{" "}
                                {item.rejectionReason}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-3.5 align-top text-xs text-cp-muted">
                            <p>{formatAppDateTime(item.createdAt)}</p>
                            {item.reviewedAt ? (
                              <p className="mt-1">
                                {item.status === "revoked" ? "Revoked" : "Reviewed"}{" "}
                                {formatAppDateTime(item.reviewedAt)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            {item.status === "pending" ? (
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-cp-primary hover:bg-cp-primary-light"
                                  disabled={busy}
                                  onClick={() => void approve(item)}
                                >
                                  <Check className="mr-1.5 h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-cp-border"
                                  disabled={busy}
                                  onClick={() => {
                                    setRejectTarget(item);
                                    setRejectionReason("");
                                  }}
                                >
                                  <X className="mr-1.5 h-3.5 w-3.5" />
                                  Decline
                                </Button>
                              </div>
                            ) : (
                              <p className="text-right text-xs text-cp-muted">—</p>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-cp-border bg-cp-elevated/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-sm text-cp-muted sm:text-left">
                  {query.data && query.data.total > 0
                    ? `Showing ${(query.data.page - 1) * query.data.pageSize + 1}–${Math.min(
                        query.data.page * query.data.pageSize,
                        query.data.total,
                      )} of ${query.data.total}`
                    : "Showing 0 of 0"}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cp-border"
                    disabled={!query.data || page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>
                  <span className="min-w-[5rem] rounded-lg border border-cp-border bg-cp-elevated px-3 py-1.5 text-center text-sm font-medium text-foreground">
                    {query.data ? `${query.data.page} / ${query.data.totalPages}` : "—"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cp-border"
                    disabled={!query.data || page >= query.data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <AdminLoadingOverlay
        show={busy}
        label={
          approveMutation.isPending ? "Granting Host role…" : "Updating request…"
        }
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Host role request</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Provide a clear reason for ${rejectTarget.userName}. This note is sent by email and shown in their app notification.`
                : "Provide a rejection reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectionReason}
              maxLength={HOST_ROLE_REJECTION_REASON_MAX}
              rows={4}
              placeholder="Explain why this request cannot be approved right now…"
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <FieldCharCounter
              current={rejectionReason.length}
              max={HOST_ROLE_REJECTION_REASON_MAX}
            />
            <p className="text-xs text-cp-muted">
              Minimum {HOST_ROLE_REJECTION_REASON_MIN} characters.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                busy || rejectionReason.trim().length < HOST_ROLE_REJECTION_REASON_MIN
              }
              onClick={() => void submitReject()}
            >
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

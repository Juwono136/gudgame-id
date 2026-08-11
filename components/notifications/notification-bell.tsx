"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Loader2,
  Search,
  Settings,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsSearch,
  useRecentNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import { resolveNotificationHref } from "@/lib/notifications/resolve-action-url";
import { readNotificationSportName } from "@/lib/notifications/tournament-label";
import type { NotificationItem } from "@/lib/notifications/types";
import { hostRoleRequestQueryKey } from "@/hooks/use-host-role-request";
import { invalidateSessionContext } from "@/lib/session/invalidate-session-context";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  if (type.includes("payment") || type.includes("payout")) {
    return <CreditCard className={className} />;
  }
  if (type.includes("host")) {
    return <Users className={className} />;
  }
  if (type.includes("confirm") || type.includes("invite")) {
    return <UserCheck className={className} />;
  }
  if (type.includes("tournament")) {
    return <Trophy className={className} />;
  }
  return <Bell className={className} />;
}

function NotificationRow({
  item,
  onRead,
  compact = false,
}: {
  item: NotificationItem;
  onRead: (item: NotificationItem) => void;
  compact?: boolean;
}) {
  const unread = !item.readAt;
  const href = resolveNotificationHref(item);
  const sportName = readNotificationSportName(item.metadata);

  return (
    <button
      type="button"
      onClick={() => onRead(item)}
      className={cn(
        "group w-full rounded-xl border text-left transition-all",
        unread
          ? "border-cp-primary/25 bg-cp-primary/[0.06] hover:bg-cp-primary/10"
          : "border-cp-border bg-cp-card/60 hover:bg-cp-elevated/80",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            unread
              ? "border-cp-primary/30 bg-cp-primary/10 text-cp-primary"
              : "border-cp-border bg-cp-elevated/60 text-cp-muted",
            compact && "h-8 w-8",
          )}
        >
          <NotificationTypeIcon
            type={item.type}
            className={cn("h-4 w-4", compact && "h-3.5 w-3.5")}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
              {item.title}
            </p>
            {unread ? (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cp-primary" aria-hidden />
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1 leading-relaxed text-cp-muted",
              compact ? "line-clamp-2 text-[11px]" : "text-xs sm:text-sm",
            )}
          >
            {item.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {sportName ? (
              <span className="rounded-full border border-cp-border/80 bg-cp-elevated/50 px-2 py-0.5 text-[10px] font-semibold text-cp-primary">
                {sportName}
              </span>
            ) : null}
            <p className="text-[10px] font-medium uppercase tracking-wide text-cp-text-dim">
              {formatRelativeTime(item.createdAt)}
            </p>
            {href ? (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-cp-primary opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                Open
                <ChevronRight className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function NotificationListSentinel({
  onVisible,
  loading,
}: {
  onVisible: () => void;
  loading: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onVisible();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="flex justify-center py-3">
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-cp-primary" /> : null}
    </div>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: recent, isLoading: recentLoading } = useRecentNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const allQuery = useNotificationsSearch(search, modalOpen);

  const handleRead = useCallback(
    (item: NotificationItem) => {
      const href = resolveNotificationHref(item);
      setModalOpen(false);
      setDropdownOpen(false);

      if (
        item.type === "host_role_request_approved" ||
        item.type === "host_role_request_rejected"
      ) {
        void queryClient.invalidateQueries({ queryKey: hostRoleRequestQueryKey });
        invalidateSessionContext(queryClient);
      }

      if (href) {
        router.push(href);
      }

      if (!item.readAt) {
        markRead.mutate(item.id);
      }
    },
    [markRead, queryClient, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined, {
      onSuccess: () => setDropdownOpen(false),
    });
  }, [markAllRead]);

  const loadMore = useCallback(() => {
    if (allQuery.hasNextPage && !allQuery.isFetchingNextPage) {
      void allQuery.fetchNextPage();
    }
  }, [allQuery]);

  const recentItems = recent?.items ?? [];
  const allItems = allQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const totalCount = allQuery.data?.pages[0]?.total ?? 0;

  return (
    <>
      <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative shrink-0 rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-elevated hover:text-foreground",
              className,
            )}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cp-primary px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(100vw-1.5rem,400px)] p-0">
          <div className="flex items-center justify-between gap-2 border-b border-cp-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 ? (
                <p className="text-[11px] text-cp-muted">{unreadCount} unread</p>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={markAllRead.isPending}
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="p-3">
            {recentLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : recentItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-cp-muted">No notifications yet.</p>
            ) : (
              <div className="max-h-[min(60vh,320px)] space-y-2 overflow-y-auto overscroll-contain">
                {recentItems.map((item) => (
                  <NotificationRow key={item.id} item={item} onRead={handleRead} compact />
                ))}
              </div>
            )}
          </div>

          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="justify-center rounded-none py-3 text-sm font-semibold text-cp-primary"
            onSelect={() => {
              setDropdownOpen(false);
              setModalOpen(true);
            }}
          >
            See all notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSearch("");
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,520px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-3 border-b border-cp-border px-4 py-4 pr-14 sm:px-5 sm:pr-14">
            <div className="space-y-1">
              <DialogTitle className="text-lg">All notifications</DialogTitle>
              <DialogDescription className="text-sm text-cp-muted">
                {totalCount > 0
                  ? `${totalCount} total${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`
                  : "Search and browse your notification history."}
              </DialogDescription>
            </div>
            {unreadCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              </div>
            ) : null}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications…"
                className="h-10 pl-9"
              />
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
            {allQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner label="Loading notifications…" />
              </div>
            ) : allItems.length === 0 ? (
              <p className="py-16 text-center text-sm text-cp-muted">
                {search.trim() ? "No notifications match your search." : "No notifications yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {allItems.map((item) => (
                  <NotificationRow key={item.id} item={item} onRead={handleRead} />
                ))}
                {allQuery.hasNextPage ? (
                  <NotificationListSentinel
                    onVisible={loadMore}
                    loading={allQuery.isFetchingNextPage}
                  />
                ) : null}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-cp-border px-4 py-3 sm:px-5">
            <p className="text-[11px] text-cp-muted">
              {allItems.length > 0 && totalCount > allItems.length
                ? `Showing ${allItems.length} of ${totalCount}`
                : allItems.length > 0
                  ? `${allItems.length} notification${allItems.length === 1 ? "" : "s"}`
                  : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs sm:hidden"
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Preferences
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

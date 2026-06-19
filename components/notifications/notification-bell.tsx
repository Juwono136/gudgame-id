"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

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

function NotificationRow({
  item,
  onRead,
  compact = false,
}: {
  item: NotificationItem;
  onRead: (id: number, url?: string | null) => void;
  compact?: boolean;
}) {
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={() => onRead(item.id, item.actionUrl)}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-cp-elevated/80",
        unread ? "border-cp-primary/30 bg-cp-primary/5" : "border-cp-border bg-cp-card/50",
        compact && "px-2.5 py-2.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-semibold text-foreground", compact && "text-xs")}>
          {item.title}
        </p>
        {unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cp-primary" /> : null}
      </div>
      <p className={cn("mt-1 text-xs leading-relaxed text-cp-muted", compact && "line-clamp-2")}>
        {item.body}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-cp-muted">
        {formatRelativeTime(item.createdAt)}
      </p>
    </button>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: recent, isLoading: recentLoading } = useRecentNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const allQuery = useNotificationsSearch(search, modalOpen);

  const handleRead = useCallback(
    (id: number, actionUrl?: string | null) => {
      void markRead.mutateAsync(id).finally(() => {
        if (actionUrl) router.push(actionUrl);
      });
    },
    [markRead, router],
  );

  const loadMore = useCallback(() => {
    if (allQuery.hasNextPage && !allQuery.isFetchingNextPage) {
      void allQuery.fetchNextPage();
    }
  }, [allQuery]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMore();
    }
  }, [loadMore]);

  const recentItems = recent?.items ?? [];

  return (
    <>
      <DropdownMenu>
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
        <DropdownMenuContent align="end" className="w-[min(100vw-2rem,380px)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Mark all read
              </Button>
            ) : null}
          </div>

          {recentLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : recentItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-cp-muted">No notifications yet.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {recentItems.map((item) => (
                <NotificationRow key={item.id} item={item} onRead={handleRead} compact />
              ))}
            </div>
          )}

          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            className="justify-center text-cp-primary"
            onSelect={() => setModalOpen(true)}
          >
            See more notifications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
          <DialogHeader className="border-b border-cp-border px-5 py-4">
            <DialogTitle>All notifications</DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications…"
                className="pl-9"
              />
            </div>
          </DialogHeader>

          <div
            ref={listRef}
            onScroll={onScroll}
            className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-4"
          >
            {allQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner label="Loading…" />
              </div>
            ) : (
              <>
                {allQuery.data?.pages.flatMap((p) => p.items).map((item) => (
                  <NotificationRow key={item.id} item={item} onRead={handleRead} />
                ))}
                {allQuery.data?.pages[0]?.items.length === 0 ? (
                  <p className="py-12 text-center text-sm text-cp-muted">No results found.</p>
                ) : null}
                {allQuery.isFetchingNextPage ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-cp-primary" />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-cp-border px-4 py-3 text-center">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settings">Notification preferences</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

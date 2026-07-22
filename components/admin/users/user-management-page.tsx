"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { RoleBadge } from "@/components/admin/layout/role-badge";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminLoadingOverlay } from "@/components/admin/ui/admin-loading-overlay";
import { CreateUserDialog } from "@/components/admin/users/create-user-dialog";
import { EditUserDialog } from "@/components/admin/users/edit-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminUserStats,
  useAdminUsersList,
  useCreateAdminUser,
  useDeleteAdminUser,
  useUpdateAdminUser,
} from "@/hooks/use-admin-users";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { AdminSessionContext } from "@/lib/admin/types";
import type { AdminUserListItem } from "@/lib/admin/users/service";
import {
  APP_ROLES,
  getRoleLabel,
  ROLE_DISPLAY_ORDER,
  type AppRole,
} from "@/lib/roles/constants";
import { resolveUserImageUrl } from "@/lib/media/client";
import { getProfileHandle } from "@/lib/auth/user-display";
import type { AdminUsersListQuery } from "@/lib/validations/admin-users";
import { cn } from "@/lib/utils";

type UserManagementPageProps = {
  context: AdminSessionContext;
};

function formatJoinDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function UserManagementPage({ context }: UserManagementPageProps) {
  const { confirm } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] =
    useState<AdminUsersListQuery["status"]>("all");
  const [sortBy, setSortBy] =
    useState<AdminUsersListQuery["sortBy"]>("name");
  const [sortDir, setSortDir] =
    useState<AdminUsersListQuery["sortDir"]>("asc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);

  const queryParams: AdminUsersListQuery = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter,
      sortBy,
      sortDir,
    }),
    [page, debouncedSearch, roleFilter, statusFilter, sortBy, sortDir],
  );

  const { data, isLoading, isFetching, error } = useAdminUsersList(queryParams);
  const { data: stats, isLoading: statsLoading } = useAdminUserStats();
  const deleteUser = useDeleteAdminUser();
  const updateUser = useUpdateAdminUser();
  const createUser = useCreateAdminUser();

  const canAssignSuperAdmin = context.roles.includes("super_admin");
  const isMutating =
    deleteUser.isPending || updateUser.isPending || createUser.isPending;

  const sortOptions: {
    value: `${AdminUsersListQuery["sortBy"]}-${AdminUsersListQuery["sortDir"]}`;
    label: string;
  }[] = [
    { value: "name-asc", label: "Name (A–Z)" },
    { value: "name-desc", label: "Name (Z–A)" },
    { value: "nickname-asc", label: "Nickname (A–Z)" },
    { value: "nickname-desc", label: "Nickname (Z–A)" },
    { value: "lastLogin-desc", label: "Last login (newest)" },
    { value: "lastLogin-asc", label: "Last login (oldest)" },
  ];

  const formatLastLogin = (iso: string | null) => {
    if (!iso) return "Never";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  };

  const openCreate = async () => {
    setCreateOpen(true);
  };

  const openEdit = async (user: AdminUserListItem) => {
    setEditingUser(user);
    setEditOpen(true);
  };

  const handleToggleActive = async (user: AdminUserListItem) => {
    if (user.id === context.userId) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    const next = !user.isActive;
    const ok = await confirm({
      title: next ? "Activate user?" : "Deactivate user?",
      description: next
        ? `${user.name} will be able to sign in again.`
        : `${user.name} will be blocked from signing in.`,
      confirmLabel: next ? "Activate" : "Deactivate",
      variant: next ? "default" : "destructive",
    });
    if (!ok) return;
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { roles: user.roles, isActive: next },
      });
      toast.success(next ? "User activated" : "User deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (user: AdminUserListItem) => {
    if (user.id === context.userId) {
      toast.error("You cannot delete your own account");
      return;
    }
    const ok = await confirm({
      title: "Delete user permanently?",
      description: `This removes ${user.email} and all related data. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const UserRowActions = ({ row }: { row: AdminUserListItem }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-cp-muted hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[100] border-cp-border bg-cp-card text-foreground"
      >
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => void openEdit(row)}
        >
          <Pencil className="h-4 w-4" />
          Edit roles & status
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => void handleToggleActive(row)}
        >
          {row.isActive ? (
            <>
              <UserX className="h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-cp-border" />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-red-400 focus:text-red-300"
          onClick={() => void handleDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AdminShell context={context} title="User Management">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="space-y-6"
      >
        <p className="text-sm leading-relaxed text-cp-muted">
          Control access levels and monitor activity for the Gud Game staff ecosystem.
        </p>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Total users"
            value={statsLoading ? "…" : (stats?.totalStaff ?? "—")}
            hint="All registered accounts"
          />
          <StatCard
            label="Active accounts"
            value={statsLoading ? "…" : (stats?.activeAccounts ?? "—")}
            hint="Can sign in today"
          />
          <StatCard
            label="Updated (24h)"
            value={statsLoading ? "…" : (stats?.activeNow ?? "—")}
            hint="Recently active profiles"
            className="sm:col-span-2 xl:col-span-1"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-card/40 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-cp-muted sm:w-auto sm:self-center">
              Quick filter
            </span>
            {ROLE_DISPLAY_ORDER.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter((f) => (f === role ? "all" : role));
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200",
                  roleFilter === role
                    ? "border-cp-primary bg-cp-primary/15 text-cp-logo-accent"
                    : "border-cp-border text-cp-muted hover:border-cp-primary/30 hover:text-foreground",
                )}
              >
                {getRoleLabel(role)}
                {stats?.byRole[role] != null ? ` · ${stats.byRole[role]}` : ""}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as AdminUsersListQuery["status"]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 min-w-[8.5rem] border-cp-border bg-cp-elevated text-sm text-foreground">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-[100] border-cp-border bg-cp-card text-foreground">
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as AppRole | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 min-w-[8.5rem] border-cp-border bg-cp-elevated text-sm text-foreground">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="z-[100] border-cp-border bg-cp-card text-foreground">
                <SelectItem value="all">All roles</SelectItem>
                {APP_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const [by, dir] = v.split("-") as [
                  AdminUsersListQuery["sortBy"],
                  AdminUsersListQuery["sortDir"],
                ];
                setSortBy(by);
                setSortDir(dir);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 min-w-[11rem] border-cp-border bg-cp-elevated text-sm text-foreground">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="z-[100] border-cp-border bg-cp-card text-foreground">
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search + create (below filters) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cp-muted" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search users, email, or nickname…"
              className="h-11 border-cp-border bg-cp-elevated pl-10 text-foreground placeholder:text-cp-muted"
            />
          </div>
          <Button
            className="h-11 shrink-0 px-5 shadow-lg shadow-cp-primary/20"
            onClick={() => void openCreate()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create user
          </Button>
        </div>

        {/* Table card */}
        <div className="relative overflow-hidden rounded-2xl border border-cp-border bg-cp-card/50 shadow-sm">
          {isFetching && !isLoading ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-cp-bg/60 backdrop-blur-[1px]"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex items-center gap-2 rounded-xl border border-cp-border bg-cp-card px-4 py-2.5 text-sm text-foreground shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-cp-logo-accent" />
                Updating list…
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="p-10 text-center text-sm text-red-400">
              {error instanceof Error ? error.message : "Failed to load users"}
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-cp-elevated" />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile / tablet cards */}
              <div className="divide-y divide-cp-border/50 lg:hidden">
                {data?.items.length === 0 ? (
                  <p className="px-4 py-16 text-center text-sm text-cp-muted">
                    No users match your filters.
                  </p>
                ) : (
                  data?.items.map((row, index) => {
                    const avatarSrc = resolveUserImageUrl(row.image);
                    const handle = getProfileHandle({
                      nickname: row.nickname,
                      email: row.email,
                    });
                    return (
                      <motion.article
                        key={row.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="p-4"
                      >
                        <div className="flex gap-3">
                          <Avatar className="h-11 w-11 shrink-0 border border-cp-border">
                            {avatarSrc ? (
                              <AvatarImage src={avatarSrc} alt={row.name} />
                            ) : null}
                            <AvatarFallback className="bg-cp-primary/15 text-xs font-semibold text-cp-primary">
                              {row.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">
                                  {row.name}
                                </p>
                                <p className="truncate text-xs text-cp-muted">
                                  {handle.isNickname
                                    ? `@${handle.handle}`
                                    : row.email}
                                </p>
                              </div>
                              <UserRowActions row={row} />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {row.roles.map((role) => (
                                <RoleBadge key={role} role={role} />
                              ))}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                                  Status
                                </p>
                                <div className="mt-1">
                                  {row.isActive ? (
                                    <Badge variant="success" className="gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="danger">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                                  Joined
                                </p>
                                <p className="mt-1 text-foreground">
                                  {formatJoinDate(row.createdAt)}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">
                                  Last login
                                </p>
                                <p className="mt-1 text-foreground">
                                  {formatLastLogin(row.lastLoginAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cp-border bg-cp-elevated/40">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        User
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        Role
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        Status
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        Joined
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        Last login
                      </th>
                      <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-cp-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center text-cp-muted">
                          No users match your filters.
                        </td>
                      </tr>
                    ) : (
                      data?.items.map((row, index) => {
                        const avatarSrc = resolveUserImageUrl(row.image);
                        const handle = getProfileHandle({
                          nickname: row.nickname,
                          email: row.email,
                        });
                        return (
                          <motion.tr
                            key={row.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03, duration: 0.2 }}
                            className="border-b border-cp-border/50 transition-colors hover:bg-cp-primary/5"
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-10 w-10 shrink-0 border border-cp-border">
                                  {avatarSrc ? (
                                    <AvatarImage src={avatarSrc} alt={row.name} />
                                  ) : null}
                                  <AvatarFallback className="bg-cp-primary/15 text-xs font-semibold text-cp-primary">
                                    {row.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground">
                                    {row.name}
                                  </p>
                                  <p className="truncate text-xs text-cp-muted">
                                    {handle.isNickname
                                      ? `@${handle.handle}`
                                      : row.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {row.roles.map((role) => (
                                  <RoleBadge key={role} role={role} />
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {row.isActive ? (
                                <Badge variant="success" className="gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="danger">Inactive</Badge>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-cp-muted">
                              {formatJoinDate(row.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-cp-muted">
                              {formatLastLogin(row.lastLoginAt)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <UserRowActions row={row} />
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-cp-border bg-cp-elevated/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-sm text-cp-muted sm:text-left">
                  {data
                    ? `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total}`
                    : "—"}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cp-border"
                    disabled={!data || page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>
                  <span className="min-w-[5rem] rounded-lg border border-cp-border bg-cp-elevated px-3 py-1.5 text-center text-sm font-medium text-foreground">
                    {data ? `${data.page} / ${data.totalPages}` : "—"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cp-border"
                    disabled={!data || page >= data.totalPages}
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
        show={isMutating}
        label={
          deleteUser.isPending
            ? "Deleting user…"
            : createUser.isPending
              ? "Creating user…"
              : "Saving changes…"
        }
      />

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        canAssignSuperAdmin={canAssignSuperAdmin}
      />

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={editingUser}
        canAssignSuperAdmin={canAssignSuperAdmin}
        currentUserId={context.userId}
      />
    </AdminShell>
  );
}

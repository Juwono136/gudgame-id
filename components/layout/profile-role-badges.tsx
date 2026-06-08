import { RoleBadge } from "@/components/admin/layout/role-badge";
import type { AppRole } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

export function ProfileRoleBadges({
  roles,
  className,
}: {
  roles: AppRole[];
  className?: string;
}) {
  if (roles.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {roles.map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
    </div>
  );
}

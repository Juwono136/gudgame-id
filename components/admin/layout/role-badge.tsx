import { Badge } from "@/components/ui/badge";
import { getRoleLabel, type AppRole } from "@/lib/roles/constants";

const VARIANT_MAP: Record<AppRole, "player" | "host" | "super_admin" | "default"> = {
  player: "player",
  host: "host",
  partner: "default",
  super_admin: "super_admin",
};

export function RoleBadge({ role, className }: { role: AppRole; className?: string }) {
  return (
    <Badge variant={VARIANT_MAP[role]} className={className}>
      {getRoleLabel(role)}
    </Badge>
  );
}

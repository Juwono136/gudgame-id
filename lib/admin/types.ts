import type { AppRole } from "@/lib/roles/constants";
import type { Permission } from "@/lib/roles/permissions";

export type AdminSessionContext = {
  userId: string;
  name: string;
  email: string;
  nickname: string | null;
  image: string | null;
  roles: AppRole[];
  activeRole: AppRole;
  permissions: Set<Permission>;
  sportSlug: string;
  sportId: number;
};

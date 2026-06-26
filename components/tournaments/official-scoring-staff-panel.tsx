"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInviteOfficialTournamentStaff,
  useOfficialTournamentStaff,
  useRemoveOfficialTournamentStaff,
} from "@/hooks/use-tournament-bracket";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import type { OfficialTournamentStaffRole } from "@/lib/tournaments/settings";

type OfficialScoringStaffPanelProps = {
  sportSlug: string;
  slug: string;
  enabled: boolean;
};

function roleLabel(role: OfficialTournamentStaffRole): string {
  return role === "host" ? "Host admin" : "Scorekeeper";
}

export function OfficialScoringStaffPanel({
  sportSlug,
  slug,
  enabled,
}: OfficialScoringStaffPanelProps) {
  const { confirm } = useConfirmDialog();
  const { data: staff = [], isLoading } = useOfficialTournamentStaff(sportSlug, slug, {
    enabled,
  });
  const invite = useInviteOfficialTournamentStaff(sportSlug, slug);
  const remove = useRemoveOfficialTournamentStaff(sportSlug, slug);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OfficialTournamentStaffRole>("scorekeeper");

  if (!enabled) return null;

  const handleInvite = () => {
    const nextEmail = email.trim();
    if (!nextEmail) return;
    invite.mutate(
      { email: nextEmail, role },
      {
        onSuccess: () => setEmail(""),
      },
    );
  };

  const handleRemove = async (userId: string, name: string) => {
    const ok = await confirm({
      title: "Remove scoring staff?",
      description: `${name} will no longer be able to manage bracket placement or official scores.`,
      confirmLabel: "Remove access",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    remove.mutate(userId);
  };

  return (
    <section className="rounded-2xl border border-cp-primary/25 bg-cp-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 text-cp-primary" />
            Official scoring staff
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-cp-muted">
            Invite trusted users to manage bracket placement and score matches from this public
            tournament page.
          </p>
        </div>
        <Badge variant="accent" className="w-fit border-0">
          Owner controls
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          className="h-11 border-cp-border bg-cp-elevated"
          disabled={invite.isPending}
        />
        <Select
          value={role}
          onValueChange={(value) => setRole(value as OfficialTournamentStaffRole)}
          disabled={invite.isPending}
        >
          <SelectTrigger className="h-11 border-cp-border bg-cp-elevated">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scorekeeper">Scorekeeper</SelectItem>
            <SelectItem value="host">Host admin</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="h-11 bg-cp-primary hover:bg-cp-primary-light"
          disabled={invite.isPending || !email.trim()}
          onClick={handleInvite}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </div>

      <div className="mt-5 space-y-2">
        {isLoading ? (
          <p className="rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-3 text-sm text-cp-muted">
            Loading staff...
          </p>
        ) : staff.length ? (
          staff.map((member) => (
            <div
              key={member.userId}
              className="flex flex-col gap-3 rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                <p className="truncate text-xs text-cp-muted">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.role === "host" ? "accent" : "muted"} className="border-0">
                  {roleLabel(member.role)}
                </Badge>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={remove.isPending}
                  onClick={() => void handleRemove(member.userId, member.name)}
                  aria-label={`Remove ${member.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-cp-border bg-cp-elevated/30 px-4 py-4 text-sm text-cp-muted">
            No delegated scoring staff yet. The tournament owner can still manage everything.
          </p>
        )}
      </div>
    </section>
  );
}

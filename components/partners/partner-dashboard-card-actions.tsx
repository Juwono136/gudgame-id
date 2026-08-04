"use client";

import Link from "next/link";
import { ExternalLink, MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PartnerDashboardCardActionsProps = {
  manageHref: string;
  publicHref: string;
  editHref?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleting?: boolean;
  manageLabel?: string;
};

/** Compact Manage + overflow menu for partner dashboard discovery cards. */
export function PartnerDashboardCardActions({
  manageHref,
  publicHref,
  editHref,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
  deleting = false,
  manageLabel = "Manage",
}: PartnerDashboardCardActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" className="h-9 flex-1 bg-cp-primary hover:bg-cp-primary-light">
        <Link href={manageHref}>
          <Settings className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {manageLabel}
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-9 shrink-0 border-cp-border px-0"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden />
              Public page
            </Link>
          </DropdownMenuItem>
          {editHref ? (
            <DropdownMenuItem asChild>
              <Link href={editHref}>
                <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden />
                Edit
              </Link>
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={deleteDisabled || deleting}
                className="text-destructive focus:text-destructive"
                title={deleteDisabled ? deleteDisabledReason : undefined}
                onSelect={(e) => {
                  e.preventDefault();
                  if (!deleteDisabled && !deleting) onDelete();
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

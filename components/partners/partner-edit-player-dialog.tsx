"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import type { PartnerPlayerListItem } from "@/lib/partners/player-stats";

const editSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Enter a valid email").transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
});

type EditValues = z.infer<typeof editSchema>;

type Props = {
  partnerSlug: string;
  player: PartnerPlayerListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PartnerEditPlayerDialog({
  partnerSlug,
  player,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  useEffect(() => {
    if (player && open) {
      form.reset({
        fullName: player.fullName,
        email: player.email,
        phone: player.phone,
      });
    }
  }, [player, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!player) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/players/${encodeURIComponent(player.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not update player");
        return;
      }
      toast.success("Player updated");
      await queryClient.invalidateQueries({ queryKey: ["partner-players", partnerSlug] });
      await queryClient.invalidateQueries({
        queryKey: ["partner-player-detail", partnerSlug, player.id],
      });
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
          <DialogDescription>
            Update name and contact details for this partner player. If they have a
            member login, their account is synced — changing email requires them to
            verify again and signs them out until then.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <PartnerLoadingOverlay show={submitting} label="Saving…" />
          <form id="partner-edit-player" onSubmit={onSubmit} className="space-y-4">
            <AuthField
              label="Full name"
              htmlFor="edit-player-name"
              error={form.formState.errors.fullName?.message}
            >
              <AuthInput id="edit-player-name" {...form.register("fullName")} />
            </AuthField>
            <AuthField
              label="Email"
              htmlFor="edit-player-email"
              error={form.formState.errors.email?.message}
            >
              <AuthInput id="edit-player-email" type="email" {...form.register("email")} />
            </AuthField>
            <AuthField
              label="Phone"
              htmlFor="edit-player-phone"
              error={form.formState.errors.phone?.message}
            >
              <AuthInput id="edit-player-phone" type="tel" {...form.register("phone")} />
            </AuthField>
          </form>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="partner-edit-player"
            disabled={submitting}
            className="bg-cp-primary hover:bg-cp-primary-light"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerEditPlayerButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-9 w-9 shrink-0"
      disabled={disabled}
      aria-label="Edit player"
      onClick={onClick}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
}

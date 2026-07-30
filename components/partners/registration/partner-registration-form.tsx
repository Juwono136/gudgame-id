"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIdrDisplay } from "@/lib/format/currency";
import {
  partnerGuestRegistrationSchema,
  type PartnerGuestRegistrationInput,
} from "@/lib/partners/registration/validation";

type PartnerRegistrationFormProps = {
  partnerSlug: string;
  tournamentSlug: string;
  tournamentName: string;
  playersPerTeam: number;
  feeIdr: number | null;
  isPaid: boolean;
};

export function PartnerRegistrationForm({
  partnerSlug,
  tournamentSlug,
  tournamentName,
  playersPerTeam,
  feeIdr,
  isPaid,
}: PartnerRegistrationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const memberCount = Math.max(0, playersPerTeam - 1);
  const schema = partnerGuestRegistrationSchema(playersPerTeam);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerGuestRegistrationInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      captain: { fullName: "", email: "", phone: "" },
      teamName: "",
      members: Array.from({ length: memberCount }, () => ({
        fullName: "",
        email: "",
        phone: "",
      })),
      notes: "",
    },
  });

  const { fields } = useFieldArray({ control, name: "members" });

  const onSubmit = async (values: PartnerGuestRegistrationInput) => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/partner/public/${partnerSlug}/tournaments/${tournamentSlug}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Registration failed");
      }

      const data = json.data as { status: string; payUrl?: string; successUrl: string };
      toast.success(
        data.status === "confirmed" ? "You're registered!" : "Team reserved — complete payment",
      );
      router.push(data.status === "confirmed" ? data.successUrl : data.payUrl ?? data.successUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cp-muted">
          Team captain
        </h2>
        <p className="mt-1 text-xs text-cp-muted">
          No Gud Game account required — used only for this registration.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="captain.fullName">Full name *</Label>
            <Input
              id="captain.fullName"
              placeholder="Jane Doe"
              aria-invalid={!!errors.captain?.fullName}
              {...register("captain.fullName")}
            />
            {errors.captain?.fullName ? (
              <p className="text-xs text-destructive">{errors.captain.fullName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="captain.email">Email *</Label>
            <Input
              id="captain.email"
              type="email"
              placeholder="jane@example.com"
              aria-invalid={!!errors.captain?.email}
              {...register("captain.email")}
            />
            {errors.captain?.email ? (
              <p className="text-xs text-destructive">{errors.captain.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="captain.phone">Phone *</Label>
            <Input
              id="captain.phone"
              placeholder="0812xxxxxxx"
              aria-invalid={!!errors.captain?.phone}
              {...register("captain.phone")}
            />
            {errors.captain?.phone ? (
              <p className="text-xs text-destructive">{errors.captain.phone.message}</p>
            ) : null}
          </div>
        </div>
      </section>

      {playersPerTeam > 1 ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cp-muted">
            Team name
          </h2>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="teamName">Team name *</Label>
            <Input
              id="teamName"
              placeholder={`${tournamentName} squad`}
              aria-invalid={!!errors.teamName}
              {...register("teamName")}
            />
            {errors.teamName ? (
              <p className="text-xs text-destructive">{errors.teamName.message}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {fields.length > 0 ? (
        <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cp-muted">
            <UserPlus className="h-4 w-4" aria-hidden />
            Teammates ({fields.length})
          </h2>
          <p className="mt-1 text-xs text-cp-muted">
            Email and phone are optional for teammates — full name is required.
          </p>
          <div className="mt-4 space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-xl border border-cp-border/70 bg-cp-elevated/30 p-4 sm:grid-cols-3"
              >
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor={`members.${index}.fullName`}>Player {index + 2} name *</Label>
                  <Input
                    id={`members.${index}.fullName`}
                    placeholder="Teammate name"
                    aria-invalid={!!errors.members?.[index]?.fullName}
                    {...register(`members.${index}.fullName` as const)}
                  />
                  {errors.members?.[index]?.fullName ? (
                    <p className="text-xs text-destructive">
                      {errors.members[index]?.fullName?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor={`members.${index}.email`}>Email</Label>
                  <Input
                    id={`members.${index}.email`}
                    type="email"
                    placeholder="Optional"
                    aria-invalid={!!errors.members?.[index]?.email}
                    {...register(`members.${index}.email` as const)}
                  />
                  {errors.members?.[index]?.email ? (
                    <p className="text-xs text-destructive">
                      {errors.members[index]?.email?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`members.${index}.phone`}>Phone</Label>
                  <Input
                    id={`members.${index}.phone`}
                    placeholder="Optional"
                    aria-invalid={!!errors.members?.[index]?.phone}
                    {...register(`members.${index}.phone` as const)}
                  />
                  {errors.members?.[index]?.phone ? (
                    <p className="text-xs text-destructive">
                      {errors.members[index]?.phone?.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          className="mt-2"
          placeholder="Anything the organizer should know"
          {...register("notes")}
        />
        {errors.notes ? <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p> : null}
      </section>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
            {isPaid ? "Registration fee" : "Entry"}
          </p>
          <p className="mt-0.5 text-lg font-bold text-foreground">
            {isPaid ? formatIdrDisplay(feeIdr ?? 0) : "Free"}
          </p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 bg-cp-primary px-6 hover:bg-cp-primary-light"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : isPaid ? (
            "Continue to payment"
          ) : (
            "Register for free"
          )}
        </Button>
      </div>
    </form>
  );
}

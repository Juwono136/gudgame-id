"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { usePartnerPlayerSession } from "@/hooks/use-partner-player-session";
import { formatIdrDisplay } from "@/lib/format/currency";
import {
  partnerGuestRegistrationSchema,
} from "@/lib/partners/registration/validation";

type PartnerRegistrationFormProps = {
  partnerSlug: string;
  tournamentSlug: string;
  tournamentName: string;
  playersPerTeam: number;
  feeIdr: number | null;
  isPaid: boolean;
  /** When set, shown as a capacity hint above the form. */
  spotsRemaining?: number | null;
};

/** RHF + zod infer output after transforms; form values are the input shape. */
type PartnerRegistrationFormValues = {
  captain: { fullName: string; email: string; phone: string };
  teamName: string;
  members: Array<{ fullName: string; email: string; phone: string }>;
  notes: string;
};

function firstFieldErrorMessage(issues: unknown): string | null {
  if (!issues || typeof issues !== "object") return null;
  const fieldErrors = (issues as { fieldErrors?: Record<string, string[] | undefined> })
    .fieldErrors;
  if (!fieldErrors) return null;

  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && messages[0]) return messages[0];
  }
  return null;
}

function emptyMembers(count: number) {
  return Array.from({ length: count }, () => ({
    fullName: "",
    email: "",
    phone: "",
  }));
}

export function PartnerRegistrationForm({
  partnerSlug,
  tournamentSlug,
  tournamentName,
  playersPerTeam,
  feeIdr,
  isPaid,
  spotsRemaining = null,
}: PartnerRegistrationFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { session, isAuthenticated, hydrated } = usePartnerPlayerSession(partnerSlug);
  const memberCount = Math.max(0, playersPerTeam - 1);
  const captainAutofilledRef = useRef(false);
  const schema = useMemo(
    () => partnerGuestRegistrationSchema(playersPerTeam),
    [playersPerTeam],
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PartnerRegistrationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod transforms widen input vs output for RHF
    resolver: zodResolver(schema) as any,
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      captain: { fullName: "", email: "", phone: "" },
      teamName: "",
      members: emptyMembers(memberCount),
      notes: "",
    },
  });

  /**
   * Autofill captain from partner member session once.
   * IMPORTANT: do not call `reset((prev) => …)` — RHF reset does not accept a
   * functional updater; that wiped internal form state while the DOM still
   * showed typed values (false "required" / "min 2 chars" errors).
   */
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !session || captainAutofilledRef.current) {
      return;
    }
    captainAutofilledRef.current = true;

    const current = getValues("captain");
    if (!current.fullName?.trim() && session.displayName) {
      setValue("captain.fullName", session.displayName, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (!current.email?.trim() && session.email) {
      setValue("captain.email", session.email, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    if (!current.phone?.trim() && session.phone) {
      setValue("captain.phone", session.phone, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [hydrated, isAuthenticated, session, getValues, setValue]);

  const { fields } = useFieldArray({ control, name: "members" });
  const signedInMember = hydrated && isAuthenticated && Boolean(session);

  const onInvalid = () => {
    const memberError = Array.isArray(errors.members)
      ? errors.members.find((m) => m?.fullName?.message || m?.email?.message || m?.phone?.message)
      : undefined;
    const first =
      errors.captain?.fullName?.message ||
      errors.captain?.email?.message ||
      errors.captain?.phone?.message ||
      errors.teamName?.message ||
      memberError?.fullName?.message ||
      memberError?.email?.message ||
      memberError?.phone?.message ||
      (typeof errors.members?.message === "string" ? errors.members.message : null) ||
      errors.notes?.message ||
      "Please check the highlighted fields and try again.";
    toast.error(String(first));
  };

  const onSubmit = async (values: PartnerRegistrationFormValues) => {
    setSubmitting(true);
    try {
      // Keep optional strings on the wire — JSON.stringify drops `undefined`, which
      // breaks server z.string() fields after client-side Zod transforms.
      const payload = {
        captain: {
          fullName: values.captain.fullName,
          email: values.captain.email,
          phone: values.captain.phone,
        },
        teamName: values.teamName ?? "",
        members: Array.from({ length: memberCount }, (_, index) => {
          const m = values.members[index];
          return {
            fullName: m?.fullName ?? "",
            email: m?.email ?? "",
            phone: m?.phone ?? "",
          };
        }),
        notes: values.notes ?? "",
      };

      const res = await fetch(
        `/api/partner/public/${encodeURIComponent(partnerSlug)}/tournaments/${encodeURIComponent(tournamentSlug)}/register`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { status: string; payUrl?: string; successUrl: string };
        error?: { message?: string; context?: { issues?: unknown } };
      } | null;

      if (!res.ok || !json?.data) {
        const fromFields = firstFieldErrorMessage(json?.error?.context?.issues);
        const message =
          fromFields ?? json?.error?.message ?? "Registration failed. Please check your details.";

        throw new Error(message);
      }

      const data = json.data;
      toast.success(
        data.status === "registered"
          ? "Registration submitted — awaiting organizer confirmation"
          : "Team reserved — complete payment",
      );
      router.push(data.status === "registered" ? data.successUrl : data.payUrl ?? data.successUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {submitting ? (
        <PartnerLoadingOverlay
          show
          label="Submitting registration…"
          variant="fullscreen"
        />
      ) : null}
      <form
        onSubmit={handleSubmit(
          (values) => onSubmit(values),
          onInvalid,
        )}
        noValidate
        className="space-y-6"
      >
        {spotsRemaining != null ? (
          <p className="text-sm text-cp-muted">
            {spotsRemaining === 1
              ? "1 team spot remaining."
              : `${spotsRemaining} team spots remaining.`}
          </p>
        ) : null}
        {signedInMember && session ? (
          <p className="rounded-xl border border-cp-primary/25 bg-cp-primary/8 px-3 py-2 text-sm text-foreground">
            Signed in as <span className="font-semibold">{session.displayName}</span>
            — captain details filled from your member account so results sync to your stats.
            {!session.phone ? (
              <span className="mt-1 block text-xs text-cp-muted">
                Add your phone number below to complete registration.
              </span>
            ) : null}
          </p>
        ) : null}
        <section className="rounded-2xl border border-cp-border bg-cp-card p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cp-muted">
            Team captain
          </h2>
          <p className="mt-1 text-xs text-cp-muted">
            {signedInMember
              ? "Using your partner member account. Keep the same email so results sync to your player stats."
              : "No Gud Game account required — used only for this registration. Sign in as a member to sync stats automatically."}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="captain.fullName">Full name *</Label>
              <Input
                id="captain.fullName"
                autoComplete="name"
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
                autoComplete="email"
                inputMode="email"
                placeholder="jane@example.com"
                readOnly={signedInMember}
                aria-invalid={!!errors.captain?.email}
                className={signedInMember ? "bg-cp-elevated/40" : undefined}
                {...register("captain.email")}
              />
              {errors.captain?.email ? (
                <p className="text-xs text-destructive">{errors.captain.email.message}</p>
              ) : signedInMember ? (
                <p className="text-[11px] text-cp-muted">
                  Locked to your member email for stats sync.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="captain.phone">Phone *</Label>
              <Input
                id="captain.phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="0812xxxxxxx"
                aria-invalid={!!errors.captain?.phone}
                {...register("captain.phone")}
              />
              {errors.captain?.phone ? (
                <p className="text-xs text-destructive">{errors.captain.phone.message}</p>
              ) : (
                <p className="text-[11px] text-cp-muted">Indonesian mobile, e.g. 0812… or +62…</p>
              )}
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
              Full name is required. Email and phone are optional — if filled, they must be valid
              and unique on this team.
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
                      autoComplete="name"
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
                      inputMode="email"
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
                      type="tel"
                      inputMode="tel"
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
            maxLength={500}
            placeholder="Anything the organizer should know"
            {...register("notes")}
          />
          {errors.notes ? (
            <p className="mt-1 text-xs text-destructive">{errors.notes.message}</p>
          ) : null}
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-cp-border bg-cp-elevated/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
            className="h-11 w-full bg-cp-primary px-6 hover:bg-cp-primary-light sm:w-auto"
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
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Lock } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { passwordSchema } from "@/lib/validations/auth";
import { useSessionContext } from "@/hooks/use-session-context";
import { resolveSafeCallbackUrl } from "@/lib/roles/route-access";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your temporary password"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordRequiredForm() {
  const router = useRouter();
  const { data: sessionCtx, refetch } = useSessionContext();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await fetch("/api/account/change-password-required", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await parseJsonResponse<{
        success?: boolean;
        error?: { message?: string };
      }>(res);

      if (!res.ok) {
        throw new Error(json.error?.message ?? "Could not update password");
      }

      toast.success("Password updated", {
        description: "Redirecting to your dashboard…",
      });

      const refreshed = await refetch();
      const roles = refreshed.data?.roles ?? sessionCtx?.roles ?? [];
      const target = resolveSafeCallbackUrl(null, roles);
      router.push(target);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  });

  return (
    <AuthShell
      variant="login"
      formTitle="Set your new password"
      formSubtitle="For security, replace the temporary password from your invitation email before continuing."
      formSize="wide"
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Temporary password"
          htmlFor="currentPassword"
          error={errors.currentPassword?.message}
          hint="From your invitation email"
          required
        >
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...register("currentPassword")}
          />
        </AuthField>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AuthField
            label="New password"
            htmlFor="password"
            error={errors.password?.message}
            hint="Min 8 chars, upper, lower, number"
            required
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </AuthField>

          <AuthField
            label="Confirm new password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </AuthField>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "btn-interactive mt-4 h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#0033C0]",
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Save and continue
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

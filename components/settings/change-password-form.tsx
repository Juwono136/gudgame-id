"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import {
  changePasswordSettingsSchema,
  setPasswordSettingsSchema,
  type ChangePasswordSettingsInput,
  type SetPasswordSettingsInput,
} from "@/lib/validations/account-settings";
import { useChangePassword, useSetPassword } from "@/hooks/use-account-settings";

type ChangePasswordFormProps = {
  hasPassword: boolean;
  hasGoogle: boolean;
};

export function ChangePasswordForm({ hasPassword, hasGoogle }: ChangePasswordFormProps) {
  const changeMutation = useChangePassword();
  const setMutation = useSetPassword();
  const isSetMode = !hasPassword;

  const form = useForm<ChangePasswordSettingsInput | SetPasswordSettingsInput>({
    resolver: zodResolver(
      isSetMode ? setPasswordSettingsSchema : changePasswordSettingsSchema,
    ),
    defaultValues: isSetMode
      ? { password: "", confirmPassword: "" }
      : { currentPassword: "", password: "", confirmPassword: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onSubmit = async (
    values: ChangePasswordSettingsInput | SetPasswordSettingsInput,
  ) => {
    try {
      const mutation = isSetMode ? setMutation : changeMutation;
      const result = await mutation.mutateAsync(values as ChangePasswordSettingsInput);
      toast.success(result.message);
      reset();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const isPending = changeMutation.isPending || setMutation.isPending;

  return (
    <SettingsSectionCard
      id="security"
      title="Password"
      description={
        isSetMode
          ? hasGoogle
            ? "Create a password to sign in with email and password in addition to Google."
            : "Create a password for your account."
          : "Update your password. You will receive a confirmation email and must use the new password on your next sign-in."
      }
    >
      {isSetMode && hasGoogle ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-cp-primary/25 bg-cp-primary/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
          <p className="text-sm leading-relaxed text-cp-muted">
            After setting a password, you can sign in with <strong className="text-foreground">Google</strong> or your{" "}
            <strong className="text-foreground">email and password</strong>.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isSetMode ? (
          <AuthField
            label="Current password"
            htmlFor="currentPassword"
            error={"currentPassword" in errors ? errors.currentPassword?.message : undefined}
          >
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
          </AuthField>
        ) : null}

        <AuthField
          label={isSetMode ? "New password" : "New password"}
          htmlFor="password"
          error={errors.password?.message}
        >
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        </AuthField>

        <AuthField
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        </AuthField>

        <p className="text-xs leading-relaxed text-cp-muted">
          Use at least 8 characters with uppercase, lowercase, and a number.
        </p>

        <div className="flex justify-end border-t border-cp-border pt-4">
          <Button
            type="submit"
            disabled={isPending}
            className="min-w-[160px] rounded-lg bg-cp-primary font-semibold hover:bg-cp-primary-light"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSetMode ? "Creating…" : "Updating…"}
              </>
            ) : isSetMode ? (
              "Create password"
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </form>
    </SettingsSectionCard>
  );
}

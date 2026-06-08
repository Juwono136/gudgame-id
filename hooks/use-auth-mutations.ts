"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import {
  ACCOUNT_INACTIVE_MESSAGE,
  mapAuthError,
  mapPasswordResetError,
} from "@/lib/auth/map-errors";
import { authRoutes } from "@/lib/constants/routes";
import type { AppRole } from "@/lib/roles/constants";
import { resolveSafeCallbackUrl } from "@/lib/roles/route-access";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  ResetPasswordFormValues,
} from "@/lib/validations/auth";
import { useAuthUiStore } from "@/stores/auth-ui-store";

export function useLoginMutation() {
  const router = useRouter();
  const setSubmitting = useAuthUiStore((s) => s.setSubmitting);

  return useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const email = values.email.trim().toLowerCase();
      const callbackUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl")
          : null;

      const eligibilityRes = await fetch("/api/account/login-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const eligibility = await parseJsonResponse<{
        success?: boolean;
        data?: { eligible?: boolean; reason?: string };
      }>(eligibilityRes);

      if (
        eligibilityRes.ok &&
        eligibility.data?.eligible === false &&
        eligibility.data.reason === "account_inactive"
      ) {
        throw new Error(ACCOUNT_INACTIVE_MESSAGE);
      }

      const result = await authClient.signIn.email({
        email,
        password: values.password,
        callbackURL: callbackUrl ?? undefined,
      });

      if (result.error) {
        throw new Error(mapAuthError(result.error.message ?? "Sign in failed"));
      }

      const ctxRes = await fetch("/api/account/session-context", {
        cache: "no-store",
      });
      const ctxJson = await parseJsonResponse<{
        success?: boolean;
        data?: { accountInactive?: boolean };
      }>(ctxRes);

      if (ctxJson.data?.accountInactive) {
        await authClient.signOut();
        throw new Error(ACCOUNT_INACTIVE_MESSAGE);
      }

      return result.data;
    },
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: async () => {
      const callbackUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("callbackUrl")
          : null;

      let roles: AppRole[] = [];
      let mustChangePassword = false;
      try {
        const res = await fetch("/api/account/session-context", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            roles?: AppRole[];
            mustChangePassword?: boolean;
            accountInactive?: boolean;
          };
        };
        if (json.data?.accountInactive) {
          await authClient.signOut();
          throw new Error(ACCOUNT_INACTIVE_MESSAGE);
        }
        if (json.success && json.data?.roles) roles = json.data.roles;
        mustChangePassword = json.data?.mustChangePassword ?? false;
      } catch (err) {
        if (err instanceof Error && err.message === ACCOUNT_INACTIVE_MESSAGE) {
          throw err;
        }
      }

      toast.success("Welcome back!", {
        description: "Redirecting to your dashboard…",
      });

      if (mustChangePassword) {
        router.push(authRoutes.changePasswordRequired);
      } else {
        router.push(resolveSafeCallbackUrl(callbackUrl, roles));
      }
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error("Sign in failed", { description: error.message });
    },
  });
}

export function useRegisterMutation() {
  const router = useRouter();
  const setSubmitting = useAuthUiStore((s) => s.setSubmitting);

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/account/register", {
        method: "POST",
        body: formData,
      });

      const payload = await parseJsonResponse<{
        error?: string;
        fieldErrors?: Record<string, string[]>;
        redirectTo?: string;
        message?: string;
      }>(response);

      if (!response.ok) {
        const err = new Error(payload.error ?? "Registration failed") as Error & {
          fieldErrors?: Record<string, string[]>;
        };
        err.fieldErrors = payload.fieldErrors;
        throw err;
      }

      return payload;
    },
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: (data) => {
      toast.success("Account created!", {
        description:
          data.message ??
          "Check your email to verify your account before signing in.",
      });
      router.push(data.redirectTo ?? authRoutes.checkEmail);
    },
    onError: (error: Error & { fieldErrors?: Record<string, string[]> }) => {
      toast.error("Registration failed", { description: error.message });
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.sendVerificationEmail({
        email: email.trim().toLowerCase(),
        callbackURL: `${window.location.origin}/auth/verify-email?status=success`,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not send verification email");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Verification email sent", {
        description: "Check your inbox and spam folder. Links expire in 24 hours.",
      });
    },
    onError: (error: Error) => {
      toast.error("Could not send email", { description: error.message });
    },
  });
}

export function useRequestPasswordResetMutation() {
  const router = useRouter();
  const setSubmitting = useAuthUiStore((s) => s.setSubmitting);

  return useMutation({
    mutationFn: async (values: ForgotPasswordFormValues) => {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim().toLowerCase() }),
      });

      const payload = await parseJsonResponse<{
        ok?: boolean;
        message?: string;
        error?: string;
        code?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send reset email");
      }

      return payload;
    },
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: (data) => {
      toast.success("Reset link sent", {
        description:
          data.message ??
          "Check your inbox for instructions. The link expires in 1 hour.",
      });
      router.push(authRoutes.forgotPasswordSent);
    },
    onError: (error: Error) => {
      toast.error("Unable to send reset link", { description: error.message });
    },
  });
}

export function useResetPasswordMutation() {
  const router = useRouter();
  const setSubmitting = useAuthUiStore((s) => s.setSubmitting);

  return useMutation({
    mutationFn: async ({
      values,
      token,
    }: {
      values: ResetPasswordFormValues;
      token: string;
    }) => {
      const result = await authClient.resetPassword({
        newPassword: values.password,
        token,
      });

      if (result.error) {
        throw new Error(
          mapPasswordResetError(result.error.message ?? "Reset failed"),
        );
      }

      return result.data;
    },
    onMutate: () => setSubmitting(true),
    onSettled: () => setSubmitting(false),
    onSuccess: () => {
      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });
      router.push(`${authRoutes.login}?reset=success`);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error("Password reset failed", { description: error.message });
    },
  });
}

export function useLogoutMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(result.error.message ?? "Sign out failed");
      }
    },
    onSuccess: () => {
      toast.success("Signed out", {
        description: "See you on court soon.",
      });
      router.push(authRoutes.login);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error("Sign out failed", { description: error.message });
    },
  });
}

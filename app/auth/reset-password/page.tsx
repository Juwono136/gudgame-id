import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Reset Password",
};

export default async function ResetPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </PageShell>
  );
}

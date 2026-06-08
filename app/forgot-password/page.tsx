import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <ForgotPasswordForm />
    </PageShell>
  );
}

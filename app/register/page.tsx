import { RegisterForm } from "@/components/auth/register-form";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Create Account",
};

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <RegisterForm />
    </PageShell>
  );
}

import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Create Account",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const { callbackUrl } = await searchParams;
  await redirectIfAuthenticated(callbackUrl);

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <Suspense fallback={null}>
        <RegisterForm callbackUrl={callbackUrl ?? null} />
      </Suspense>
    </PageShell>
  );
}

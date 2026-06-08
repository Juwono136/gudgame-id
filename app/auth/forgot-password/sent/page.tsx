import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { authRoutes } from "@/lib/constants/routes";
import { PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";

const EXPIRY_HOURS = Math.max(
  1,
  Math.round(PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS / 3600),
);

export const metadata = {
  title: "Check your email",
};

export default async function ForgotPasswordSentPage() {
  await redirectIfAuthenticated();

  return (
    <PageShell
      showGridBackground={false}
      showFooter={false}
      showNavbar={false}
      mainClassName="min-h-0 flex-1"
    >
      <div className="flex min-h-[100dvh] flex-col bg-cp-bg">
        <header className="border-b border-cp-border/60 px-4 py-4 sm:px-6">
          <BrandLogo size="md" href="/" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-cp-border bg-cp-card p-6 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cp-primary/40 bg-cp-primary/15">
              <Mail className="h-7 w-7 text-cp-primary" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-white sm:text-2xl">
              Check your inbox
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-cp-muted">
              We sent a password reset link to your email. Open it and follow the steps
              to set a new password.
            </p>
            <p className="mt-2 text-xs text-cp-text-dim">
              Links expire in {EXPIRY_HOURS} hour{EXPIRY_HOURS === 1 ? "" : "s"}. Check
              spam if you do not see the message within a few minutes.
            </p>
            <Link
              href={authRoutes.login}
              className="btn-interactive mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-cp-primary text-sm font-semibold text-white hover:bg-[#0033C0]"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import { Mail } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { authRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Check your email",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const { callbackUrl } = await searchParams;
  await redirectIfAuthenticated(callbackUrl);

  const loginHref = callbackUrl
    ? `${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : authRoutes.login;

  return (
    <PageShell showGridBackground={false} showFooter={false} showNavbar={false}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cp-primary/40 bg-cp-primary/15">
          <Mail className="h-8 w-8 text-cp-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Check your inbox</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          We sent a confirmation link to your email. Click the link to verify your
          account, then sign in to continue.
          {callbackUrl ? " You will return to where you left off." : ""}
        </p>
        <p className="mt-2 text-xs text-cp-muted">
          Did not receive it? Check spam or wait a few minutes before requesting again.
        </p>
        <Link
          href={loginHref}
          className="btn-interactive mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-cp-primary px-8 text-sm font-semibold text-white hover:bg-[#00a67a]"
        >
          Back to Sign In
        </Link>
      </div>
    </PageShell>
  );
}

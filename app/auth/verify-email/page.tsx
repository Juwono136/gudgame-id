import Link from "next/link";
import { CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { authRoutes, dashboardRoutes } from "@/lib/constants/routes";
import { EMAIL_VERIFICATION_EXPIRES_IN_SECONDS } from "@/lib/auth/constants";

const EXPIRY_HOURS = Math.round(EMAIL_VERIFICATION_EXPIRES_IN_SECONDS / 3600);

type PageProps = {
  searchParams: Promise<{ status?: string; error?: string; callbackUrl?: string }>;
};

export default async function VerifyEmailResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status?.toLowerCase();
  const error = params.error?.toLowerCase() ?? "";
  const callbackUrl = params.callbackUrl;
  const loginHref = callbackUrl
    ? `${authRoutes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : authRoutes.login;

  const isSuccess = status === "success" && !error;
  const isExpired =
    error.includes("expired") ||
    error.includes("expire") ||
    error === "verification_expired";
  const isInvalid =
    !isSuccess &&
    (error.includes("invalid") ||
      error.includes("token") ||
      error === "invalid_token" ||
      Boolean(error));

  return (
    <PageShell showGridBackground={false} showFooter={false}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        {isSuccess ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#DAF8E7]/30 bg-[#1C352A]/80">
              <CheckCircle2 className="h-8 w-8 text-[#DAF8E7]" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-white">Email verified</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Your email is confirmed. Sign in to continue
              {callbackUrl ? " to the tournament or page you were joining." : " to Gud Game."}
            </p>
            <Link
              href={loginHref}
              className="btn-interactive mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-cp-primary px-8 text-sm font-semibold text-white hover:bg-[#00a67a]"
            >
              Sign In
            </Link>
          </>
        ) : isExpired ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10">
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-white">Link expired</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              For your security, verification links expire after{" "}
              <strong className="text-white">{EXPIRY_HOURS} hours</strong>. Request a new
              email by signing in — we will send another confirmation link if your account
              is not verified yet.
            </p>
            <Link
              href={authRoutes.login}
              className="btn-interactive mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-cp-primary px-8 text-sm font-semibold text-white hover:bg-[#00a67a]"
            >
              Go to Sign In
            </Link>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10">
              {isInvalid ? (
                <XCircle className="h-8 w-8 text-[#ff6b6b]" />
              ) : (
                <ShieldAlert className="h-8 w-8 text-[#ff6b6b]" />
              )}
            </div>
            <h1 className="mt-6 text-2xl font-bold text-white">
              {isInvalid ? "Invalid verification link" : "Verification failed"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              This link may have already been used, tampered with, or is no longer valid.
              Sign in to request a fresh verification email, or register again if needed.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Link
                href={authRoutes.login}
                className="btn-interactive inline-flex h-11 items-center justify-center rounded-lg bg-cp-primary px-6 text-sm font-semibold text-white hover:bg-[#00a67a]"
              >
                Sign In
              </Link>
              <Link
                href={authRoutes.register}
                className="btn-interactive inline-flex h-11 items-center justify-center rounded-lg border border-cp-border px-6 text-sm font-semibold text-white hover:bg-cp-elevated"
              >
                Register
              </Link>
            </div>
          </>
        )}

        <p className="mt-10 text-xs text-cp-muted">
          Need help?{" "}
          <Link href={dashboardRoutes.home} className="text-cp-primary hover:underline">
            Return home
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/config";
import { authRoutes, dashboardRoutes } from "@/lib/constants/routes";

export const metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-full bg-cp-primary/20 blur-3xl"
            aria-hidden
          />
          <Image
            src={brandAssets.logo}
            alt=""
            width={80}
            height={80}
            className="relative h-16 w-16 sm:h-20 sm:w-20"
          />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cp-primary">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Court not found
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-cp-muted sm:text-base">
          The page you requested does not exist. Please check the URL or return to the home page.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            className="btn-interactive h-11 rounded-lg bg-cp-primary font-semibold text-white hover:bg-[#0033C0]"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

      </div>
    </PageShell>
  );
}

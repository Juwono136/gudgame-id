/**
 * Resolve public discovery card CTA (Join / Bracket / Results).
 * Keeps list pages deep-linking into register or bracket without extra hops.
 */

export type DiscoveryCtaEmphasis = "primary" | "secondary";

export type TournamentDiscoveryCta = {
  label: string;
  href: string;
  emphasis: DiscoveryCtaEmphasis;
};

const ACTIVE_REGISTRATION = new Set([
  "confirmed",
  "pending_payment",
  "awaiting_confirmation",
]);

export function isActiveRegistrationStatus(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_REGISTRATION.has(status));
}

export function withTournamentTab(detailHref: string, tab: string): string {
  const base = detailHref.split("?")[0] ?? detailHref;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

export function resolveTournamentDiscoveryCta(input: {
  status: string;
  detailHref: string;
  registerHref: string;
  /** True when the viewer already has an in-progress or confirmed registration. */
  isRegistered?: boolean;
}): TournamentDiscoveryCta {
  const { status, detailHref, registerHref, isRegistered = false } = input;
  const bracketHref = withTournamentTab(detailHref, "Bracket");
  const liveHref = withTournamentTab(detailHref, "Live Score");

  if (status === "completed" || status === "cancelled") {
    return {
      label: status === "completed" ? "Bracket" : "Open",
      href: status === "completed" ? bracketHref : detailHref,
      emphasis: "secondary",
    };
  }

  if (status === "live") {
    return {
      label: "Bracket",
      href: bracketHref,
      emphasis: "secondary",
    };
  }

  // upcoming / draft / unknown — prefer Join unless already registered
  if (isRegistered) {
    return {
      label: "Bracket",
      href: bracketHref,
      emphasis: "secondary",
    };
  }

  if (status === "upcoming" || status === "draft") {
    return {
      label: "Join",
      href: registerHref || detailHref,
      emphasis: "primary",
    };
  }

  // Fallback for odd statuses while live-adjacent
  return {
    label: "Open",
    href: liveHref,
    emphasis: "secondary",
  };
}

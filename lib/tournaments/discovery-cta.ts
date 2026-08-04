/**
 * Resolve public discovery card CTA (Join / Bracket).
 * Join when the viewer is not registered; Bracket once they are (or for completed events).
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
  "awaiting_payment",
  "registered",
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

  if (status === "cancelled") {
    return {
      label: "Open",
      href: detailHref,
      emphasis: "secondary",
    };
  }

  // Completed events: always open bracket/results.
  if (status === "completed") {
    return {
      label: "Bracket",
      href: bracketHref,
      emphasis: "secondary",
    };
  }

  if (isRegistered) {
    return {
      label: "Bracket",
      href: bracketHref,
      emphasis: "secondary",
    };
  }

  return {
    label: "Join",
    href: registerHref || detailHref,
    emphasis: "primary",
  };
}

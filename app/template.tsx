"use client";

/**
 * Route templates remount children in Next.js by design.
 * Do not key the entire tree by pathname — that tears down React Query,
 * effects, and client state on every navigation (feels like a full refresh).
 *
 * Framer Motion / bfcache issues should be fixed locally in motion sections.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return children;
}

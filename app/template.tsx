"use client";

import { usePathname } from "next/navigation";

/**
 * Forces a fresh client mount per route — fixes Framer Motion + bfcache
 * leaving sections invisible after browser Back.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}

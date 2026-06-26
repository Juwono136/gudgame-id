"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { usePathname } from "next/navigation";

type ContentHeaderProps = {
  title: string;
  description: string;
};

export function ContentHeader({ title, description }: ContentHeaderProps) {
  const pathname = usePathname();

  return (
    <FadeIn mountKey={`header-${pathname}`}>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cp-muted sm:text-base">
          {description}
        </p>
      </div>
    </FadeIn>
  );
}

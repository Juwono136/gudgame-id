"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RichHtmlContent } from "@/components/wiki/rich-html-content";
import { cn } from "@/lib/utils";

const COLLAPSED_MAX_PX = 192;

type ExpandableBiographyProps = {
  html: string;
  className?: string;
};

export function ExpandableBiography({ html, className }: ExpandableBiographyProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      setNeedsToggle(el.scrollHeight > COLLAPSED_MAX_PX + 8);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [html]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <div
          ref={contentRef}
          className={cn(
            "transition-[max-height] duration-300 ease-out",
            expanded ? "max-h-none" : "max-h-48 overflow-hidden",
          )}
        >
          <RichHtmlContent html={html} variant="article" />
        </div>
        {!expanded && needsToggle ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-cp-card to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      {needsToggle || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cp-primary transition-colors hover:text-cp-primary-light"
        >
          {expanded ? (
            <>
              Show less
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              See more
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

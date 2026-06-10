"use client";

import Image from "next/image";
import { isLocalPreviewUrl } from "@/lib/tournaments/cover-preview-url";
import { cn } from "@/lib/utils";

type TournamentCoverPreviewProps = {
  src: string;
  alt?: string;
  className?: string;
  /** Use absolute fill layout (parent must be `relative`) */
  fill?: boolean;
};

export function TournamentCoverPreview({
  src,
  alt = "",
  className,
  fill = false,
}: TournamentCoverPreviewProps) {
  if (isLocalPreviewUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob URLs are not supported reliably by next/image across wizard steps
      <img
        src={src}
        alt={alt}
        className={cn(fill && "absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={cn(fill && "object-cover", className)}
      unoptimized
    />
  );
}

import Image from "next/image";
import { cn } from "@/lib/utils";

type WikiImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  /** Mark above-the-fold LCP images for eager loading */
  priority?: boolean;
};

export function WikiImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority = false,
}: WikiImageProps) {
  const external = src.startsWith("http://") || src.startsWith("https://");

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={cn(className)}
      sizes={sizes}
      priority={priority}
      loading={priority ? "eager" : undefined}
      unoptimized={external}
    />
  );
}

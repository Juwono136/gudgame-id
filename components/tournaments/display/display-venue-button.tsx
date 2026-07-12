import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Buttons on the always-dark venue display shell — readable in any site theme. */
export const displayVenueButtonClass = cn(
  "border-white/30 bg-white/12 text-white shadow-lg",
  "hover:border-white/45 hover:bg-white/22 hover:text-white",
);

type DisplayVenueButtonProps = ComponentProps<typeof Button>;

export function DisplayVenueButton({ className, ...props }: DisplayVenueButtonProps) {
  return <Button className={cn(displayVenueButtonClass, className)} {...props} />;
}

"use client";

import { Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimePreview } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  min?: string;
  disabled?: boolean;
};

const fieldClass = cn(
  "border-cp-border bg-cp-bg-input pl-10 font-medium text-foreground",
  // Keep native picker chrome on the light palette, then invert the indicator in dark mode.
  // Pairing color-scheme:dark + invert makes the icon black-on-dark (invisible).
  "[color-scheme:light]",
  // Keep disabled fields readable (base Input uses opacity-50).
  "disabled:opacity-100 disabled:text-foreground/75",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
  "[&::-webkit-calendar-picker-indicator]:opacity-80",
  "dark:[&::-webkit-calendar-picker-indicator]:invert",
  "dark:[&::-webkit-calendar-picker-indicator]:brightness-125",
  "dark:[&::-webkit-calendar-picker-indicator]:opacity-90",
);

const iconClass =
  "pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-800 dark:text-emerald-400/90";

/** Styled date + time picker — theme-aware native chrome (light + dark). */
export function DateTimePicker({
  value,
  onChange,
  label,
  className,
  min,
  disabled = false,
}: DateTimePickerProps) {
  const datePart = value ? value.slice(0, 10) : "";
  const timePart = value.length >= 16 ? value.slice(11, 16) : "";

  const update = (date: string, time: string) => {
    if (!date) {
      onChange("");
      return;
    }
    onChange(`${date}T${time || "09:00"}`);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Calendar className={iconClass} aria-hidden />
          <Input
            type="date"
            value={datePart}
            min={min?.slice(0, 10)}
            onChange={(e) => update(e.target.value, timePart)}
            disabled={disabled}
            className={fieldClass}
          />
        </div>
        <div className="relative">
          <Clock className={iconClass} aria-hidden />
          <Input
            type="time"
            value={timePart}
            onChange={(e) =>
              update(datePart || new Date().toISOString().slice(0, 10), e.target.value)
            }
            disabled={disabled || !datePart}
            className={fieldClass}
          />
        </div>
      </div>
      {value ? (
        <p className="text-xs text-cp-muted">{formatDateTimePreview(value)}</p>
      ) : null}
    </div>
  );
}

"use client";

import { Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTimePreview } from "@/lib/storage/format-datetime";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  min?: string;
};

/** Styled date + time picker (native inputs with consistent dark UI). */
export function DateTimePicker({
  value,
  onChange,
  label,
  className,
  min,
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
          <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-400/80" />
          <Input
            type="date"
            value={datePart}
            min={min?.slice(0, 10)}
            onChange={(e) => update(e.target.value, timePart)}
            className="border-cp-border bg-cp-bg-input pl-10 [color-scheme:dark]"
          />
        </div>
        <div className="relative">
          <Clock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-400/80" />
          <Input
            type="time"
            value={timePart}
            onChange={(e) => update(datePart || new Date().toISOString().slice(0, 10), e.target.value)}
            disabled={!datePart}
            className="border-cp-border bg-cp-bg-input pl-10 [color-scheme:dark] disabled:opacity-50"
          />
        </div>
      </div>
      {value ? (
        <p className="text-xs text-cp-muted">{formatDateTimePreview(value)}</p>
      ) : null}
    </div>
  );
}

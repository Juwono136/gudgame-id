"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_GENDER_LABELS, USER_GENDERS, type UserGender } from "@/lib/constants/user-gender";
import { cn } from "@/lib/utils";

const UNSET_GENDER_VALUE = "__unset__";

type GenderSelectFieldProps = {
  value: UserGender | "";
  onChange: (value: UserGender) => void;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
};

export function GenderSelectField({
  value,
  onChange,
  required = false,
  error,
  className,
  id = "gender",
}: GenderSelectFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* <Label htmlFor={id}>
        Gender
        {required ? <span className="text-red-400"> *</span> : null}
      </Label> */}
      {/* <p className="text-xs text-cp-muted">
        Required for official tournaments with Male or Female categories. Not shown publicly beyond
        your player profile.
      </p> */}
      <Select
        value={value || UNSET_GENDER_VALUE}
        onValueChange={(v) => {
          if (v !== UNSET_GENDER_VALUE) onChange(v as UserGender);
        }}
        required={required}
      >
        <SelectTrigger id={id} className="border-cp-border bg-cp-bg-input" aria-invalid={Boolean(error)}>
          <SelectValue placeholder="Select gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET_GENDER_VALUE} disabled className="sr-only">
            Placeholder
          </SelectItem>
          {USER_GENDERS.map((g) => (
            <SelectItem key={g} value={g}>
              {USER_GENDER_LABELS[g]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

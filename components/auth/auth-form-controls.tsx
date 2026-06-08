"use client";

import { forwardRef } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { phoneCountries } from "@/lib/constants/phone-countries";
import {
  cpControlClass,
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

export const authControlClass = cpControlClass;
export const authSelectTriggerClass = cpSelectTriggerClass;
export const authSelectContentClass = cpSelectContentClass;
export const authSelectItemClass = cpSelectItemClass;

type AuthInputProps = React.ComponentProps<typeof Input>;

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={cn(authControlClass, className)} {...props} />
  ),
);
AuthInput.displayName = "AuthInput";

type PhoneCountrySelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  id?: string;
  "aria-invalid"?: boolean;
};

export function PhoneCountrySelect<T extends FieldValues>({
  control,
  name,
  id = "phoneCountryCode",
  "aria-invalid": ariaInvalid,
}: PhoneCountrySelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger
            id={id}
            aria-invalid={ariaInvalid}
            className={authSelectTriggerClass}
          >
            <SelectValue placeholder="Country code" />
          </SelectTrigger>
          <SelectContent className={authSelectContentClass} position="popper">
            {phoneCountries.map((country) => (
              <SelectItem
                key={country.code}
                value={country.code}
                className={authSelectItemClass}
              >
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

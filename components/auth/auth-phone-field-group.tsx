"use client";

import type { Control, FieldPath, FieldValues, UseFormRegister } from "react-hook-form";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput, PhoneCountrySelect } from "@/components/auth/auth-form-controls";
import { cn } from "@/lib/utils";

type AuthPhoneFieldGroupProps<T extends FieldValues> = {
  control: Control<T>;
  register: UseFormRegister<T>;
  countryCodeName?: FieldPath<T>;
  phoneName?: FieldPath<T>;
  countryError?: string;
  phoneError?: string;
  className?: string;
};

/**
 * Country code + phone as one unit — shared hint/error row avoids grid misalignment.
 */
export function AuthPhoneFieldGroup<T extends FieldValues>({
  control,
  register,
  countryCodeName = "phoneCountryCode" as FieldPath<T>,
  phoneName = "phone" as FieldPath<T>,
  countryError,
  phoneError,
  className,
}: AuthPhoneFieldGroupProps<T>) {
  const hasError = Boolean(countryError || phoneError);
  const errorMessage = phoneError ?? countryError;

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="sr-only">Phone number</legend>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] md:gap-x-4 md:gap-y-0">
        <AuthField
          label="Country code"
          htmlFor={String(countryCodeName)}
          required
          suppressFooter
          className="md:min-w-0"
        >
          <PhoneCountrySelect
            control={control}
            name={countryCodeName}
            id={String(countryCodeName)}
            aria-invalid={!!countryError}
          />
        </AuthField>

        <AuthField
          label="Phone / WhatsApp"
          htmlFor={String(phoneName)}
          required
          suppressFooter
          className="min-w-0"
        >
          <AuthInput
            id={String(phoneName)}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="8123456789"
            aria-invalid={!!phoneError}
            aria-describedby="phone-field-message"
            {...register(phoneName)}
          />
        </AuthField>
      </div>

      <div
        id="phone-field-message"
        className={cn(
          "rounded-lg px-2 py-1.5 text-xs leading-relaxed transition-colors",
          hasError
            ? "border border-destructive/25 bg-destructive/5 text-destructive"
            : "text-cp-text-dim",
        )}
        role={hasError ? "alert" : undefined}
      >
        {errorMessage ?? "Digits only, without country code — e.g. 8123456789"}
      </div>
    </fieldset>
  );
}

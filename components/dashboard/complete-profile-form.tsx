"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthPhoneFieldGroup } from "@/components/auth/auth-phone-field-group";
import { PhotoUploadField } from "@/components/auth/photo-upload-field";
import { SportInterestsField } from "@/components/settings/sport-interests-field";
import { Button } from "@/components/ui/button";
import { defaultPhoneCountry } from "@/lib/constants/phone-countries";
import {
  completeProfileSchema,
  type CompleteProfileFormValues,
} from "@/lib/validations/profile-completion";
import { GenderSelectField } from "@/components/auth/gender-select-field";
import { validateProfilePhoto } from "@/lib/validations/auth";
import { useCompleteProfileMutation } from "@/hooks/use-complete-profile";
import { cn } from "@/lib/utils";
import { useState } from "react";

type CompleteProfileFormProps = {
  initialFullName?: string | null;
};

function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-xs leading-relaxed text-cp-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function CompleteProfileForm({ initialFullName }: CompleteProfileFormProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const completeProfile = useCompleteProfileMutation();
  const submitting = completeProfile.isPending;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CompleteProfileFormValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      fullNameKtp: initialFullName ?? "",
      phoneCountryCode: defaultPhoneCountry.code,
      phone: "",
      nickname: "",
      sportInterestSlugs: [],
      gender: "male",
    },
  });

  const onSubmit = async (values: CompleteProfileFormValues) => {
    if (photo) {
      const photoCheck = validateProfilePhoto(photo);
      if (!photoCheck.ok) {
        setPhotoError(photoCheck.message);
        return;
      }
    }
    setPhotoError(undefined);

    const formData = new FormData();
    formData.append("fullNameKtp", values.fullNameKtp);
    formData.append("phoneCountryCode", values.phoneCountryCode);
    formData.append("phone", values.phone);
    if (values.nickname) formData.append("nickname", values.nickname);
    if (photo) formData.append("photo", photo);
    formData.append("sportInterestSlugs", JSON.stringify(values.sportInterestSlugs));
    formData.append("gender", values.gender);

    completeProfile.mutate(formData, {
      onError: (err: Error & { fieldErrors?: Record<string, string[]> }) => {
        if (err.fieldErrors) {
          for (const [key, messages] of Object.entries(err.fieldErrors)) {
            if (messages?.[0]) {
              setError(key as keyof CompleteProfileFormValues, {
                message: messages[0],
              });
            }
          }
          if (err.fieldErrors.photo?.[0]) {
            setPhotoError(err.fieldErrors.photo[0]);
          }
        } else {
          toast.error("Update failed", { description: err.message });
        }
      },
    });
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormSection
        title="Profile photo"
        description="Optional — add a photo so other players can recognize you."
      >
        <PhotoUploadField
          error={photoError}
          onChange={(file) => {
            setPhoto(file);
            if (file) setPhotoError(undefined);
          }}
        />
      </FormSection>

      <FormSection
        title="Identity"
        description="Use the name shown on your government ID."
        className="border-t border-cp-border pt-8"
      >
        <AuthField
          label="Full name (as shown on ID)"
          htmlFor="fullNameKtp"
          error={errors.fullNameKtp?.message}
          required
        >
          <AuthInput
            id="fullNameKtp"
            placeholder="Legal name on KTP / passport"
            autoComplete="name"
            aria-invalid={!!errors.fullNameKtp}
            {...register("fullNameKtp")}
          />
        </AuthField>
      </FormSection>

      <FormSection
        title="Contact"
        description="We use this for account recovery and tournament notifications."
        className="border-t border-cp-border pt-8"
      >
        <AuthPhoneFieldGroup
          control={control}
          register={register}
          countryError={errors.phoneCountryCode?.message}
          phoneError={errors.phone?.message}
        />
      </FormSection>

      <FormSection
        title="Gender"
        description="Required for official tournaments with Male or Female categories."
        className="border-t border-cp-border pt-8"
      >
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <GenderSelectField
              value={field.value ?? ""}
              onChange={field.onChange}
              required
              error={errors.gender?.message}
            />
          )}
        />
      </FormSection>

      <FormSection
        title="Sports you follow"
        description="Pick at least one sport — other players can see your interests on your profile."
        className="border-t border-cp-border pt-8"
      >
        <Controller
          control={control}
          name="sportInterestSlugs"
          render={({ field }) => (
            <SportInterestsField
              value={field.value}
              onChange={field.onChange}
              error={errors.sportInterestSlugs?.message}
            />
          )}
        />
      </FormSection>

      <FormSection
        title="Display name"
        description="Optional public handle for the community."
        className="border-t border-cp-border pt-8"
      >
        <AuthField
          label="Nickname"
          htmlFor="nickname"
          error={errors.nickname?.message}
          hint="Unique, 3–50 characters — letters and numbers only"
        >
          <AuthInput
            id="nickname"
            placeholder="e.g. padel_pro_jakarta"
            autoComplete="username"
            aria-invalid={!!errors.nickname}
            {...register("nickname", {
              setValueAs: (v: string) => v.replace(/\s/g, ""),
            })}
          />
        </AuthField>
      </FormSection>

      <div className="border-t border-cp-border pt-6">
        <Button
          type="submit"
          disabled={submitting}
          className={cn(
            "btn-interactive h-11 w-full rounded-lg bg-cp-primary text-sm font-semibold text-primary-foreground hover:bg-[var(--cp-primary-light)] sm:h-12",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save profile"
          )}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthPhoneFieldGroup } from "@/components/auth/auth-phone-field-group";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { SportInterestsField } from "@/components/settings/sport-interests-field";
import { GenderSelectField } from "@/components/auth/gender-select-field";
import type { AccountSettingsView } from "@/lib/account/settings/get-settings";
import { defaultPhoneCountry, phoneCountries } from "@/lib/constants/phone-countries";
import {
  staffProfileUpdateSchema,
  type StaffProfileUpdateInput,
} from "@/lib/validations/account-settings";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/validations/auth";
import { useUpdateStaffProfile } from "@/hooks/use-account-settings";

function resolveCountryIso(dial: string | null): string {
  if (!dial) return defaultPhoneCountry.code;
  const match = phoneCountries.find((c) => c.dial === dial || c.code === dial);
  return match?.code ?? defaultPhoneCountry.code;
}

type StaffProfileFormProps = {
  settings: AccountSettingsView;
};

export function StaffProfileForm({ settings }: StaffProfileFormProps) {
  const mutation = useUpdateStaffProfile();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<StaffProfileUpdateInput>({
    resolver: zodResolver(staffProfileUpdateSchema),
    defaultValues: {
      fullNameKtp: settings.account.fullNameKtp ?? settings.account.name ?? "",
      phoneCountryCode: resolveCountryIso(settings.account.phoneCountryCode),
      phone: settings.account.phone ?? "",
      sportInterestSlugs: (settings.account.sportInterestSlugs ?? []) as StaffProfileUpdateInput["sportInterestSlugs"],
      gender: (settings.account.gender ?? "male") as StaffProfileUpdateInput["gender"],
    },
  });

  const currentImage = photoPreview ?? settings.account.imageUrl;

  const handlePhoto = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoError(undefined);
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setPhotoError("Photo must be 2 MB or smaller");
      return;
    }
    setPhotoError(undefined);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: StaffProfileUpdateInput) => {
    const formData = new FormData();
    formData.set("fullNameKtp", values.fullNameKtp);
    formData.set("phoneCountryCode", values.phoneCountryCode);
    formData.set("phone", values.phone);
    formData.set("sportInterestSlugs", JSON.stringify(values.sportInterestSlugs ?? []));
    formData.set("gender", values.gender);
    if (photo) formData.set("photo", photo);

    try {
      const result = await mutation.mutateAsync(formData);
      toast.success(result.message);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(null);
      setPhotoPreview(null);
    } catch (err) {
      const error = err as Error & { fieldErrors?: Record<string, string[]> };
      toast.error(error.message);
    }
  };

  return (
    <SettingsSectionCard
      id="profile"
      title="Profile"
      description="Update your display name, profile photo, contact details, and sport interests."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border border-cp-border bg-cp-elevated sm:mx-0">
            {currentImage ? (
              <Image src={currentImage} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Camera className="h-8 w-8 text-cp-muted" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg bg-cp-primary px-4 py-2 text-xs font-semibold text-white hover:bg-cp-primary-light">
                Choose file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                />
              </label>
              {photo ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-cp-border px-3 py-2 text-xs text-cp-muted hover:bg-cp-elevated"
                  onClick={() => handlePhoto(null)}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear selection
                </button>
              ) : null}
            </div>
            {photoError ? (
              <p className="text-xs text-destructive" role="alert">
                {photoError}
              </p>
            ) : (
              <p className="text-xs text-cp-muted">JPEG, PNG, WebP or GIF · max 2 MB</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <AuthField label="Full name" htmlFor="fullNameKtp" error={errors.fullNameKtp?.message}>
            <AuthInput id="fullNameKtp" {...register("fullNameKtp")} autoComplete="name" />
          </AuthField>

          <AuthPhoneFieldGroup
            control={control}
            register={register}
            countryError={errors.phoneCountryCode?.message}
            phoneError={errors.phone?.message}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <GenderSelectField
                value={field.value}
                onChange={field.onChange}
                required
                error={errors.gender?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="sportInterestSlugs"
            render={({ field }) => (
              <SportInterestsField
                value={field.value ?? []}
                onChange={field.onChange}
                error={errors.sportInterestSlugs?.message}
              />
            )}
          />
        </div>

        <div className="flex justify-end border-t border-cp-border pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending || (!isDirty && !photo)}
            className="w-full min-w-[140px] rounded-lg bg-cp-primary font-semibold hover:bg-cp-primary-light sm:w-auto"
          >
            {mutation.isPending ? (
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
    </SettingsSectionCard>
  );
}

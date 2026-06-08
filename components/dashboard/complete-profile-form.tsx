"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { AuthPhoneFieldGroup } from "@/components/auth/auth-phone-field-group";
import { PhotoUploadField } from "@/components/auth/photo-upload-field";
import { Button } from "@/components/ui/button";
import { defaultPhoneCountry } from "@/lib/constants/phone-countries";
import { dashboardRoutes } from "@/lib/constants/routes";
import {
  completeProfileSchema,
  type CompleteProfileFormValues,
} from "@/lib/validations/profile-completion";
import { validateProfilePhoto } from "@/lib/validations/auth";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { cn } from "@/lib/utils";

type CompleteProfileFormProps = {
  initialFullName?: string | null;
  needsPhoto: boolean;
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

export function CompleteProfileForm({
  initialFullName,
  needsPhoto,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

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
    },
  });

  const onSubmit = async (values: CompleteProfileFormValues) => {
    if (needsPhoto) {
      const photoCheck = validateProfilePhoto(photo);
      if (!photoCheck.ok) {
        setPhotoError(photoCheck.message);
        return;
      }
    }
    setPhotoError(undefined);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullNameKtp", values.fullNameKtp);
      formData.append("phoneCountryCode", values.phoneCountryCode);
      formData.append("phone", values.phone);
      if (values.nickname) formData.append("nickname", values.nickname);
      if (needsPhoto && photo) formData.append("photo", photo);

      const res = await fetch("/api/account/complete-profile", {
        method: "POST",
        body: formData,
      });
      const payload = await parseJsonResponse<{
        error?: string;
        fieldErrors?: Record<string, string[]>;
        message?: string;
      }>(res);

      if (!res.ok) {
        if (payload.fieldErrors) {
          for (const [key, messages] of Object.entries(payload.fieldErrors)) {
            if (messages?.[0]) {
              setError(key as keyof CompleteProfileFormValues, {
                message: messages[0],
              });
            }
          }
          if (payload.fieldErrors.photo?.[0]) {
            setPhotoError(payload.fieldErrors.photo[0]);
          }
        }
        throw new Error(payload.error ?? "Could not save profile");
      }

      toast.success("Profile updated", {
        description: payload.message ?? "Your account details are now complete.",
      });
      router.push(dashboardRoutes.home);
      router.refresh();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit(onSubmit)} noValidate>
      {needsPhoto ? (
        <FormSection
          title="Profile photo"
          description="Required for player verification — same rules as registration."
        >
          <PhotoUploadField
            error={photoError}
            onChange={(file) => {
              setPhoto(file);
              if (file) setPhotoError(undefined);
            }}
          />
        </FormSection>
      ) : null}

      <FormSection
        title="Identity"
        description="Use the name shown on your government ID."
        className={needsPhoto ? "border-t border-cp-border pt-8" : undefined}
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

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthInput,
  PhoneCountrySelect,
} from "@/components/auth/auth-form-controls";
import { PhotoUploadField } from "@/components/auth/photo-upload-field";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { useCreateAdminUser } from "@/hooks/use-admin-users";
import { APP_ROLES, getRoleLabel, type AppRole } from "@/lib/roles/constants";
import { defaultPhoneCountry } from "@/lib/constants/phone-countries";
import { getNicknameFormatError } from "@/lib/auth/nickname-rules";
import { phoneCountryIsoCodes } from "@/lib/constants/phone-countries";
import { validateProfilePhoto } from "@/lib/validations/auth";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { cn } from "@/lib/utils";

const createFormSchema = z.object({
  fullNameKtp: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(150, "Full name is too long")
    .regex(
      /^[\p{L}\s'.-]+$/u,
      "Use letters as shown on ID (no numbers or symbols)",
    ),
  email: z.string().trim().email("Enter a valid email address"),
  phoneCountryCode: z
    .string()
    .refine((v) => phoneCountryIsoCodes.includes(v), "Select a valid country"),
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .max(15, "Phone number is too long")
    .regex(/^[0-9]+$/, "Phone number must contain digits only"),
  nickname: z
    .string()
    .optional()
    .superRefine((v, ctx) => {
      const trimmed = v?.trim() ?? "";
      if (!trimmed) return;
      const err = getNicknameFormatError(trimmed);
      if (err) ctx.addIssue({ code: "custom", message: err });
    }),
  roles: z.array(z.enum(APP_ROLES)).min(1, "Select at least one role"),
  isActive: z.boolean(),
  partnerSlug: z.string().trim().max(80).optional(),
  partnerDisplayName: z.string().trim().max(120).optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAssignSuperAdmin: boolean;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  canAssignSuperAdmin,
}: CreateUserDialogProps) {
  const { confirm } = useConfirmDialog();
  const createUser = useCreateAdminUser();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | undefined>();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      fullNameKtp: "",
      email: "",
      phoneCountryCode: defaultPhoneCountry.code,
      phone: "",
      nickname: "",
      roles: ["player"],
      isActive: true,
      partnerSlug: "",
      partnerDisplayName: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        fullNameKtp: "",
        email: "",
        phoneCountryCode: defaultPhoneCountry.code,
        phone: "",
        nickname: "",
        roles: ["player"],
        isActive: true,
        partnerSlug: "",
        partnerDisplayName: "",
      });
      setPhoto(null);
      setPhotoError(undefined);
    }
  }, [open, form]);

  const availableRoles = APP_ROLES.filter(
    (r) => r !== "super_admin" || canAssignSuperAdmin,
  );

  const toggleRole = (role: AppRole) => {
    const current = form.getValues("roles");
    if (current.includes(role)) {
      if (current.length === 1) return;
      form.setValue(
        "roles",
        current.filter((r) => r !== role),
        { shouldValidate: true },
      );
    } else {
      form.setValue("roles", [...current, role], { shouldValidate: true });
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const photoCheck = validateProfilePhoto(photo);
    if (!photoCheck.ok) {
      setPhotoError(photoCheck.message);
      return;
    }
    setPhotoError(undefined);

    const ok = await confirm({
      title: "Create new user?",
      description: `${values.email} will receive an invitation email with a confirmation link and a temporary password. They must verify their email and set a new password on first sign-in.`,
      confirmLabel: "Create & send invite",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    const formData = new FormData();
    formData.append("photo", photoCheck.file);
    formData.append("fullNameKtp", values.fullNameKtp);
    formData.append("email", values.email);
    formData.append("phoneCountryCode", values.phoneCountryCode);
    formData.append("phone", values.phone);
    if (values.nickname?.trim()) formData.append("nickname", values.nickname.trim());
    for (const role of values.roles) formData.append("roles", role);
    formData.append("isActive", values.isActive ? "true" : "false");
    if (values.roles.includes("partner")) {
      if (values.partnerSlug?.trim()) {
        formData.append("partnerSlug", values.partnerSlug.trim());
      }
      if (values.partnerDisplayName?.trim()) {
        formData.append("partnerDisplayName", values.partnerDisplayName.trim());
      }
    }

    try {
      await createUser.mutateAsync(formData);
      toast.success("User invited", {
        description: values.roles.includes("partner")
          ? `Invitation and Partner access emails sent to ${values.email}.`
          : `Invitation email sent to ${values.email}.`,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Create failed";
      toast.error(message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,800px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-cp-border px-5 py-4 pr-12 text-left">
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Same profile fields as public registration. A secure temporary password is
            generated automatically and sent by email after you confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <PhotoUploadField
              error={photoError}
              onChange={(file) => {
                setPhoto(file);
                if (file) setPhotoError(undefined);
              }}
            />

            <AuthField
              label="Full name (as shown on ID)"
              htmlFor="create-fullNameKtp"
              error={form.formState.errors.fullNameKtp?.message}
              required
            >
              <AuthInput
                id="create-fullNameKtp"
                placeholder="Legal name on KTP / passport"
                className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                aria-invalid={!!form.formState.errors.fullNameKtp}
                {...form.register("fullNameKtp")}
              />
            </AuthField>

            <AuthField
              label="Email"
              htmlFor="create-email"
              error={form.formState.errors.email?.message}
              required
            >
              <AuthInput
                id="create-email"
                type="email"
                placeholder="you@example.com"
                className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
            </AuthField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
              <AuthField
                label="Country code"
                htmlFor="create-phoneCountry"
                error={form.formState.errors.phoneCountryCode?.message}
                required
              >
                <PhoneCountrySelect
                  control={form.control}
                  name="phoneCountryCode"
                  aria-invalid={!!form.formState.errors.phoneCountryCode}
                />
              </AuthField>

              <AuthField
                label="Phone / WhatsApp"
                htmlFor="create-phone"
                error={form.formState.errors.phone?.message}
                hint="Digits only"
                required
              >
                <AuthInput
                  id="create-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="8123456789"
                  className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                  aria-invalid={!!form.formState.errors.phone}
                  {...form.register("phone")}
                />
              </AuthField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthField
                label="Nickname"
                htmlFor="create-nickname"
                error={form.formState.errors.nickname?.message}
                hint="Optional — unique, no spaces"
              >
                <AuthInput
                  id="create-nickname"
                  placeholder="e.g. padel_pro_jakarta"
                  className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                  {...form.register("nickname", {
                    setValueAs: (v: string) => v.replace(/\s/g, ""),
                  })}
                />
              </AuthField>

              <div className="space-y-2">
                <Label htmlFor="create-tier" className="text-sm font-medium text-foreground">
                  Player tier
                </Label>
                <div
                  id="create-tier"
                  className="rounded-xl border border-cp-border bg-cp-elevated/40 px-3 py-2.5"
                >
                  <p className="text-sm font-semibold text-foreground">Bronze</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-cp-muted">
                    New players start at Bronze. Tier and career points update automatically
                    from official tournament results (win/loss by event tier).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Roles</Label>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => {
                  const selected = form.watch("roles").includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                        selected
                          ? "border-cp-primary bg-cp-primary/20 text-cp-logo-accent"
                          : "border-cp-border text-cp-muted hover:border-cp-primary/40 hover:text-foreground",
                      )}
                    >
                      {getRoleLabel(role)}
                    </button>
                  );
                })}
              </div>
              {form.formState.errors.roles ? (
                <p className="text-xs text-red-400">{form.formState.errors.roles.message}</p>
              ) : null}
            </div>

            {form.watch("roles").includes("partner") ? (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-cp-primary/25 bg-cp-primary/5 p-4 sm:grid-cols-2">
                <AuthField
                  label="Partner route slug"
                  htmlFor="create-partner-slug"
                  hint="Public URL: /your-slug"
                  required
                >
                  <AuthInput
                    id="create-partner-slug"
                    placeholder="e.g. padelarea"
                    className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                    {...form.register("partnerSlug")}
                  />
                </AuthField>
                <AuthField
                  label="Partner display name"
                  htmlFor="create-partner-name"
                  hint="Shown on the white-label site"
                  required
                >
                  <AuthInput
                    id="create-partner-name"
                    placeholder="e.g. PadelArea"
                    className="border-cp-border bg-cp-bg-input text-foreground placeholder:text-cp-muted"
                    {...form.register("partnerDisplayName")}
                  />
                </AuthField>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Account status</Label>
              <Select
                value={form.watch("isActive") ? "active" : "inactive"}
                onValueChange={(v) =>
                  form.setValue("isActive", v === "active", { shouldDirty: true })
                }
              >
                <SelectTrigger className={cpSelectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={cn(cpSelectContentClass, "z-[400]")}>
                  <SelectItem value="active" className={cpSelectItemClass}>
                    Active — can sign in after verifying email
                  </SelectItem>
                  <SelectItem value="inactive" className={cpSelectItemClass}>
                    Inactive — blocked until activated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/10 px-4 py-3 text-sm text-cp-muted">
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cp-logo-accent" />
                <span>
                  The user will receive one email with a verification link and temporary
                  password. After confirming their email, they sign in and must choose a new
                  password before accessing any dashboard.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-cp-border bg-cp-card/80 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full border-cp-border sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={createUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={createUser.isPending}>
              {createUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create & send invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

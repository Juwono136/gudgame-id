import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  buildPartnerBrandingPatch,
  hasPartnerBrandingErrors,
  validatePartnerBrandingForm,
} from "@/lib/partners/branding-validation";
import {
  getPrimaryPartnerForUser,
  updatePartnerBranding,
} from "@/lib/partners/service";
import { listPartnerTournamentTeasers } from "@/lib/partners/tournaments";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }
    const tournaments = await listPartnerTournamentTeasers(partner.id, {
      limit: 20,
      status: "all",
    });
    return jsonSuccess({ partner, tournaments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireApiPartnerDashboardAccess();
    const partner = await getPrimaryPartnerForUser(ctx.userId);
    if (!partner) {
      throw new AppError("No partner organization linked", {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const body = (await request.json()) as {
      displayName?: string;
      slug?: string;
      primaryColor?: string;
      accentColor?: string;
      logoUrl?: string | null;
      tagline?: string | null;
      about?: string | null;
      heroTitle?: string | null;
      contactEmail?: string | null;
      contactWhatsapp?: string | null;
      contactWebsite?: string | null;
    };

    const formValues = {
      displayName: body.displayName ?? partner.displayName,
      slug: body.slug ?? partner.slug,
      primaryColor: body.primaryColor ?? partner.branding.primaryColor ?? "#0d9488",
      accentColor: body.accentColor ?? partner.branding.accentColor ?? "#14b8a6",
      heroTitle: body.heroTitle ?? "",
      tagline: body.tagline ?? "",
      about: body.about ?? "",
      contactEmail: body.contactEmail ?? "",
      contactWhatsapp: body.contactWhatsapp ?? "",
      contactWebsite: body.contactWebsite ?? "",
    };

    const errors = validatePartnerBrandingForm(formValues);
    if (hasPartnerBrandingErrors(errors)) {
      const first = Object.values(errors)[0] ?? "Invalid branding fields";
      throw new AppError(first, {
        code: "VALIDATION_ERROR",
        statusCode: 422,
        context: { fieldErrors: errors },
      });
    }

    const patch = buildPartnerBrandingPatch(formValues);

    const updated = await updatePartnerBranding(partner.id, {
      displayName: patch.displayName,
      slug: patch.slug,
      logoUrl: body.logoUrl,
      branding: {
        primaryColor: patch.primaryColor,
        accentColor: patch.accentColor,
        tagline: patch.tagline ?? "",
        about: patch.about ?? "",
        heroTitle: patch.heroTitle ?? "",
        contactEmail: patch.contactEmail ?? "",
        contactWhatsapp: patch.contactWhatsapp ?? "",
        contactWebsite: patch.contactWebsite ?? "",
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}

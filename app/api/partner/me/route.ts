import { NextResponse } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiPartnerDashboardAccess } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
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

    const updated = await updatePartnerBranding(partner.id, {
      displayName: body.displayName,
      slug: body.slug,
      logoUrl: body.logoUrl,
      branding: {
        ...(body.primaryColor ? { primaryColor: body.primaryColor } : {}),
        ...(body.accentColor ? { accentColor: body.accentColor } : {}),
        tagline: body.tagline ?? "",
        about: body.about ?? "",
        heroTitle: body.heroTitle ?? "",
        contactEmail: body.contactEmail ?? "",
        contactWhatsapp: body.contactWhatsapp ?? "",
        contactWebsite: body.contactWebsite ?? "",
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}

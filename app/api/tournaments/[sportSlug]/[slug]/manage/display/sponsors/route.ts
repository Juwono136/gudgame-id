import { jsonError, jsonSuccess } from "@/lib/api/response";
import { requireApiRoleGuardContext } from "@/lib/auth/role-guard";
import { AppError } from "@/lib/errors";
import {
  appendTournamentSponsorBanner,
  removeTournamentSponsorBanner,
  reorderTournamentSponsorBanners,
} from "@/lib/tournaments/display-config-service";
import { getTournamentBySlug } from "@/lib/tournaments/service";
import { uploadTournamentSponsorBanner } from "@/lib/tournaments/upload-sponsor-banner";
import { MAX_DISPLAY_SPONSOR_BANNERS } from "@/lib/tournaments/settings";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("Image file is required", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const labelRaw = form.get("label");
    const label = typeof labelRaw === "string" ? labelRaw : undefined;

    const uploaded = await uploadTournamentSponsorBanner(file, sportSlug, tournament.id);
    if (!uploaded.ok) {
      throw new AppError(uploaded.error, { code: "VALIDATION_ERROR", statusCode: 422 });
    }

    const displayConfig = await appendTournamentSponsorBanner(tournament, userId, roles, {
      imageUrl: uploaded.url,
      storageKey: uploaded.storageKey,
      label,
    });

    return jsonSuccess({
      displayConfig,
      maxBanners: MAX_DISPLAY_SPONSOR_BANNERS,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const deleteSchema = z.object({
  bannerId: z.string().uuid(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid banner id", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const displayConfig = await removeTournamentSponsorBanner(
      tournament,
      userId,
      roles,
      parsed.data.bannerId,
    );

    return jsonSuccess({ displayConfig });
  } catch (error) {
    return jsonError(error);
  }
}

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).max(MAX_DISPLAY_SPONSOR_BANNERS),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sportSlug: string; slug: string }> },
) {
  try {
    const { userId, roles } = await requireApiRoleGuardContext();
    const { sportSlug, slug } = await params;
    const tournament = await getTournamentBySlug(sportSlug, slug);

    if (!tournament) {
      throw new AppError("Tournament not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError("Invalid sponsor order", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }

    const displayConfig = await reorderTournamentSponsorBanners(
      tournament,
      userId,
      roles,
      parsed.data.orderedIds,
    );

    return jsonSuccess({ displayConfig });
  } catch (error) {
    return jsonError(error);
  }
}

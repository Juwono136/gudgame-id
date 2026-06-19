import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";

export type TournamentCoverUploadResult = {
  url: string;
  storageKey: string;
};

export async function uploadTournamentCoverClient(
  file: File,
  sportSlug: string,
  tournamentId?: string,
): Promise<TournamentCoverUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("sportSlug", sportSlug);
  if (tournamentId) form.append("tournamentId", String(tournamentId));

  const res = await fetch("/api/tournaments/cover", { method: "POST", body: form });
  const json = await parseJsonResponse<{
    success: boolean;
    data: TournamentCoverUploadResult;
    error?: unknown;
  }>(res);

  if (!res.ok) {
    throw new Error(extractApiErrorMessage(json, "Banner upload failed"));
  }

  return json.data;
}

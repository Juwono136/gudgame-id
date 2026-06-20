import { AppError } from "@/lib/errors";

export async function parseRequestJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Invalid JSON body", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }
}

import { z } from "zod";
import { AppError } from "@/lib/errors";
import { WIKI_BATCH_SCRAPE_MAX_URLS } from "@/lib/wiki/scrapers/constants";

function fieldLabel(path: PropertyKey[]): string {
  if (path.length === 0) return "";
  return path.map(String).join(".");
}

export function formatZodValidationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request. Please check your input and try again.";

  const path = fieldLabel(issue.path);

  if (issue.code === "too_big" && issue.origin === "array") {
    const max = "maximum" in issue ? issue.maximum : undefined;
    if (path === "urls" && max === WIKI_BATCH_SCRAPE_MAX_URLS) {
      return `You can import up to ${WIKI_BATCH_SCRAPE_MAX_URLS} products at a time. Deselect some items and try again.`;
    }
    if (typeof max === "number") {
      return path
        ? `${path}: select at most ${max} item${max === 1 ? "" : "s"}.`
        : `Select at most ${max} item${max === 1 ? "" : "s"}.`;
    }
  }

  if (issue.code === "too_small" && issue.origin === "array") {
    const min = "minimum" in issue ? issue.minimum : undefined;
    if (path === "urls") {
      return "Select at least one product to import.";
    }
    if (typeof min === "number") {
      return path
        ? `${path}: select at least ${min} item${min === 1 ? "" : "s"}.`
        : `Select at least ${min} item${min === 1 ? "" : "s"}.`;
    }
  }

  if (issue.code === "invalid_format" || issue.code === "invalid_type") {
    if (path === "url" || path.endsWith(".url") || path === "urls") {
      return "Enter a valid product or catalog URL.";
    }
  }

  if (path) {
    return `${path}: ${issue.message}`;
  }

  return issue.message;
}

export function zodErrorToAppError(error: z.ZodError): AppError {
  return new AppError(formatZodValidationMessage(error), {
    code: "VALIDATION_ERROR",
    statusCode: 422,
  });
}

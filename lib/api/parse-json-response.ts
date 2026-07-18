export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const status = response.status;

  if (!text.trim()) {
    throw new Error(
      `Empty server response (HTTP ${status}). Please refresh the page and try again.`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (!contentType.includes("application/json")) {
      throw new Error(
        `Unexpected server response (HTTP ${status}). Please refresh the page and try again.`,
      );
    }
    throw new Error(
      `Invalid server response (HTTP ${status}). Please refresh the page and try again.`,
    );
  }
}

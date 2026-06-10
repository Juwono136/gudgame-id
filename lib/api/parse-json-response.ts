export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      "Unexpected server response. Please refresh the page and try again.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (!contentType.includes("application/json")) {
      throw new Error(
        "Unexpected server response. Please refresh the page and try again.",
      );
    }
    throw new Error("Invalid server response. Please refresh the page and try again.");
  }
}

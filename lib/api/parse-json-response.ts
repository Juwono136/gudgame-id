export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Unexpected server response. Please refresh the page and try again.",
    );
  }

  return response.json() as Promise<T>;
}

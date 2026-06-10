/** Local blob/data URLs used before cover is uploaded to storage. */
export function isLocalPreviewUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

export function revokeLocalPreviewUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

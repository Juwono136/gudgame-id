/** Client-safe image rules for homepage CMS uploads (SeaweedFS). */

export const SITE_MEDIA_KINDS = [
  "hero-banner",
  "hero-logo",
  "footer-logo",
] as const;

export type SiteMediaKind = (typeof SITE_MEDIA_KINDS)[number];

export type SiteImageSpec = {
  kind: SiteMediaKind;
  label: string;
  /** MIME types accepted by the file picker / validator */
  allowedTypes: readonly string[];
  acceptAttr: string;
  maxBytes: number;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  aspectHint: string;
};

export const SITE_IMAGE_SPECS: Record<SiteMediaKind, SiteImageSpec> = {
  "hero-banner": {
    kind: "hero-banner",
    label: "Banner background",
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp",
    maxBytes: 10 * 1024 * 1024,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    minWidth: 1200,
    minHeight: 630,
    aspectHint: "16:9 landscape",
  },
  "hero-logo": {
    kind: "hero-logo",
    label: "Hero logo",
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp",
    maxBytes: 2 * 1024 * 1024,
    recommendedWidth: 560,
    recommendedHeight: 176,
    minWidth: 200,
    minHeight: 64,
    aspectHint: "wide logo (~3:1)",
  },
  "footer-logo": {
    kind: "footer-logo",
    label: "Footer logo",
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptAttr: "image/jpeg,image/png,image/webp",
    maxBytes: 2 * 1024 * 1024,
    recommendedWidth: 560,
    recommendedHeight: 176,
    minWidth: 160,
    minHeight: 48,
    aspectHint: "wide logo (~3:1)",
  },
};

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export function siteImageHint(spec: SiteImageSpec): string {
  return [
    `${spec.aspectHint}.`,
    `Recommended ${spec.recommendedWidth}×${spec.recommendedHeight}px`,
    `(min ${spec.minWidth}×${spec.minHeight}px).`,
    `JPEG, PNG, or WebP · max ${formatBytes(spec.maxBytes)}.`
  ].join(" ");
}

export type SiteImageValidationResult =
  | { ok: true; width: number; height: number; warning?: string }
  | { ok: false; message: string };

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

/** Validate format, size, and dimensions in the browser before queuing an upload. */
export async function validateSiteImageFile(
  file: File,
  kind: SiteMediaKind,
): Promise<SiteImageValidationResult> {
  const spec = SITE_IMAGE_SPECS[kind];
  if (!file || file.size === 0) {
    return { ok: false, message: "No file selected" };
  }
  if (!spec.allowedTypes.includes(file.type)) {
    return {
      ok: false,
      message: `${spec.label}: use JPEG, PNG, or WebP only`,
    };
  }
  if (file.size > spec.maxBytes) {
    return {
      ok: false,
      message: `${spec.label} must be ${formatBytes(spec.maxBytes)} or smaller`,
    };
  }

  let width: number;
  let height: number;
  try {
    const dims = await loadImageDimensions(file);
    width = dims.width;
    height = dims.height;
  } catch {
    return { ok: false, message: "Could not read this image. Try another file." };
  }

  if (width < spec.minWidth || height < spec.minHeight) {
    return {
      ok: false,
      message: `${spec.label} is too small (${width}×${height}px). Minimum ${spec.minWidth}×${spec.minHeight}px; recommended ${spec.recommendedWidth}×${spec.recommendedHeight}px.`,
    };
  }

  const matchesRecommended =
    width === spec.recommendedWidth && height === spec.recommendedHeight;
  if (!matchesRecommended) {
    return {
      ok: true,
      width,
      height,
      warning: `${spec.label} is ${width}×${height}px. Recommended ${spec.recommendedWidth}×${spec.recommendedHeight}px for best quality.`,
    };
  }

  return { ok: true, width, height };
}

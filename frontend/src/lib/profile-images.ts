export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function canonicalImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.href;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function withImageCacheBust(url: string, version: number): string {
  return `${canonicalImageUrl(url)}?v=${version}`;
}

export function versionFromProfile(updatedAt?: string): number {
  if (!updatedAt) return Date.now();
  const n = Date.parse(updatedAt);
  return Number.isFinite(n) ? n : Date.now();
}

export function validateProfileImageFile(
  file: File,
  maxBytes: number,
  label: string,
): string | null {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return `${label}: use JPEG, PNG, or WebP.`;
  }
  if (file.size > maxBytes) {
    return `${label}: file must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }
  return null;
}

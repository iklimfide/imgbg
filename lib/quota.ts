export const GUEST_TTL_MS = 48 * 60 * 60 * 1000;

export const GUEST_IMAGE_MAX_BYTES = Number(process.env.GUEST_IMAGE_MAX_BYTES ?? 8 * 1024 * 1024);
export const GUEST_VIDEO_MAX_BYTES = Number(process.env.GUEST_VIDEO_MAX_BYTES ?? 25 * 1024 * 1024);
export const GUEST_AUDIO_MAX_BYTES = Number(process.env.GUEST_AUDIO_MAX_BYTES ?? 15 * 1024 * 1024);
export const GUEST_STORAGE_MAX_BYTES = Number(process.env.GUEST_STORAGE_MAX_BYTES ?? 50 * 1024 * 1024);

export const MEMBER_IMAGE_MAX_BYTES = Number(process.env.IMAGE_MAX_BYTES ?? 20 * 1024 * 1024);
export const MEMBER_VIDEO_MAX_BYTES = Number(process.env.VIDEO_MAX_BYTES ?? 100 * 1024 * 1024);
export const MEMBER_AUDIO_MAX_BYTES = Number(process.env.AUDIO_MAX_BYTES ?? 50 * 1024 * 1024);
export const MEMBER_STORAGE_MAX_BYTES = Number(
  process.env.MEMBER_STORAGE_MAX_BYTES ?? 2 * 1024 * 1024 * 1024,
);

export function fileLimit(isMember: boolean, type: "image" | "video" | "audio") {
  if (type === "image") {
    return isMember ? MEMBER_IMAGE_MAX_BYTES : GUEST_IMAGE_MAX_BYTES;
  }
  if (type === "audio") {
    return isMember ? MEMBER_AUDIO_MAX_BYTES : GUEST_AUDIO_MAX_BYTES;
  }
  return isMember ? MEMBER_VIDEO_MAX_BYTES : GUEST_VIDEO_MAX_BYTES;
}

export function storageLimit(isMember: boolean) {
  return isMember ? MEMBER_STORAGE_MAX_BYTES : GUEST_STORAGE_MAX_BYTES;
}

export function formatMb(bytes: number) {
  return Math.round(bytes / (1024 * 1024));
}

export const TTL_OPTIONS = [
  { key: "1m", ms: 60 * 1000, label: "1 dakika sonra silinsin" },
  { key: "5m", ms: 5 * 60 * 1000, label: "5 dakika sonra silinsin" },
  { key: "1d", ms: 24 * 60 * 60 * 1000, label: "1 gün sonra silinsin" },
  { key: "1mo", ms: 30 * 24 * 60 * 60 * 1000, label: "1 ay sonra silinsin" },
  { key: "1y", ms: 365 * 24 * 60 * 60 * 1000, label: "1 sene sonra silinsin" },
] as const;

export type TtlKey = (typeof TTL_OPTIONS)[number]["key"] | "forever";

export function ttlLabel(key: string) {
  if (key === "forever") {
    return "Kalıcı (silinmesin)";
  }
  return TTL_OPTIONS.find((item) => item.key === key)?.label ?? "1 gün sonra silinsin";
}

export function resolveExpiry(isMember: boolean, ttl: string) {
  if (ttl === "forever") {
    return isMember ? null : new Date(Date.now() + (TTL_OPTIONS.find((item) => item.key === "1y")?.ms ?? 0));
  }
  const option = TTL_OPTIONS.find((item) => item.key === ttl) ?? TTL_OPTIONS.find((item) => item.key === "1d");
  return new Date(Date.now() + (option?.ms ?? 24 * 60 * 60 * 1000));
}

export const SITE_NAME = "imgBG.net";

export function getSiteUrl() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function shareUrl(kod: string, origin?: string) {
  const base = origin?.replace(/\/$/, "") ?? getSiteUrl();
  return `${base}/${kod}`;
}

export {
  GUEST_IMAGE_MAX_BYTES,
  GUEST_VIDEO_MAX_BYTES,
  GUEST_AUDIO_MAX_BYTES,
  MEMBER_IMAGE_MAX_BYTES,
  MEMBER_VIDEO_MAX_BYTES,
  MEMBER_AUDIO_MAX_BYTES,
} from "@/lib/quota";

export type MediaKind = "image" | "video" | "audio";

export const ALLOWED_TYPES: Record<string, { type: MediaKind; ext: string }> = {
  "image/jpeg": { type: "image", ext: "jpg" },
  "image/jpg": { type: "image", ext: "jpg" },
  "image/png": { type: "image", ext: "png" },
  "image/webp": { type: "image", ext: "webp" },
  "image/gif": { type: "image", ext: "gif" },
  "video/mp4": { type: "video", ext: "mp4" },
  "video/webm": { type: "video", ext: "webm" },
  "audio/mpeg": { type: "audio", ext: "mp3" },
  "audio/mp3": { type: "audio", ext: "mp3" },
  "audio/wav": { type: "audio", ext: "wav" },
  "audio/wave": { type: "audio", ext: "wav" },
  "audio/x-wav": { type: "audio", ext: "wav" },
  "audio/ogg": { type: "audio", ext: "ogg" },
  "audio/webm": { type: "audio", ext: "webm" },
  "audio/mp4": { type: "audio", ext: "m4a" },
  "audio/aac": { type: "audio", ext: "aac" },
  "audio/x-m4a": { type: "audio", ext: "m4a" },
  "audio/flac": { type: "audio", ext: "flac" },
};

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
};

export function parseMediaKind(value: FormDataEntryValue | string | null): MediaKind {
  return value === "video" || value === "audio" ? value : "image";
}

export function mimeFromFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "";
}

export function asShareKind(type: string): MediaKind {
  return type === "video" || type === "audio" ? type : "image";
}

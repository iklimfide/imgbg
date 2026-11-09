import { assertPublicHttpUrl } from "@/lib/remote-media";

const TWEET_HOSTS = new Set([
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "fxtwitter.com",
  "vxtwitter.com",
  "fixupx.com",
  "fixvx.com",
]);

type VideoPick = { url: string; bitrate: number; size: number };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function tweetIdFromUrl(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (!TWEET_HOSTS.has(host) && !TWEET_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    return parsed.pathname.match(/\/(?:status|statuses)\/(\d{5,20})/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function pushVideo(list: VideoPick[], url: unknown, bitrate = 0, size = 0) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    return;
  }
  if (/\.m3u8(\?|$)/i.test(url)) {
    return;
  }
  list.push({ url, bitrate, size: Number(size) || 0 });
}

function collectVideos(media: Record<string, unknown> | null) {
  const list: VideoPick[] = [];
  const videos = Array.isArray(media?.videos) ? media.videos : [];
  const all = Array.isArray(media?.all) ? media.all : [];
  for (const item of [...videos, ...all]) {
    const video = asRecord(item);
    if (!video) {
      continue;
    }
    const type = String(video.type ?? "");
    if (type && type !== "video" && type !== "gif") {
      continue;
    }
    const formats = Array.isArray(video.formats) ? video.formats : [];
    for (const row of formats) {
      const format = asRecord(row);
      if (!format) {
        continue;
      }
      const container = String(format.container ?? "");
      if (container === "m3u8") {
        continue;
      }
      if (container === "mp4" || String(format.url ?? "").includes(".mp4")) {
        pushVideo(list, format.url, Number(format.bitrate) || 0, Number(format.size) || 0);
      }
    }
    pushVideo(list, video.url, 0, Number(video.filesize) || 0);
  }
  return list.sort((a, b) => b.bitrate - a.bitrate || b.size - a.size);
}

function collectPhotos(media: Record<string, unknown> | null) {
  const photos = Array.isArray(media?.photos) ? media.photos : [];
  return photos
    .map((item) => asRecord(item)?.url)
    .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url));
}

export async function resolveTwitterMedia(rawUrl: string) {
  const id = tweetIdFromUrl(rawUrl);
  if (!id) {
    return null;
  }
  const endpoint = await assertPublicHttpUrl(`https://api.fxtwitter.com/2/status/${id}`);
  const response = await fetch(endpoint.href, {
    headers: {
      Accept: "application/json",
      "User-Agent": "imgBG.net/1.0 (media import)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload || (payload.code !== 200 && response.status !== 200)) {
    if (payload?.code === 401) {
      throw new Error("Bu gönderi gizli; video alınamaz.");
    }
    throw new Error("Twitter/X gönderisi bulunamadı.");
  }
  const status = asRecord(payload.status) ?? asRecord(payload.tweet);
  const media = asRecord(status?.media);
  return {
    id,
    videos: collectVideos(media),
    photos: collectPhotos(media),
  };
}

export function pickTwitterVideo(videos: VideoPick[], maxBytes: number) {
  const fitting = videos.filter((item) => !item.size || item.size <= maxBytes);
  return (fitting[0] ?? videos[0]) ?? null;
}

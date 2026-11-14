import { assertPublicHttpUrl } from "@/lib/remote-media";

const IG_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
  "www.instagr.am",
]);

const FB_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.watch",
  "www.fb.watch",
]);

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MOBILE_IG_UA =
  "Instagram 275.0.0.27.98 Android (33/13; 280dpi; 720x1423; Xiaomi; Redmi 7; onclite; qcom; en_US; 458229237)";
const IG_APP_ID = "936619743392459";
const HTML_MAX = 4_000_000;

export type SocialKind = "instagram" | "facebook";

export type SocialMedia = {
  kind: SocialKind;
  id: string;
  referer: string;
  videos: string[];
  photos: string[];
};

function hostOf(raw: string) {
  try {
    return new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function socialKindFromUrl(raw: string): SocialKind | null {
  const host = hostOf(raw);
  if (IG_HOSTS.has(host)) {
    return "instagram";
  }
  if (FB_HOSTS.has(host)) {
    return "facebook";
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pushHttp(list: string[], value: unknown) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) {
    return;
  }
  if (/\.m3u8(\?|$)/i.test(value) || value.includes(".jpg") || value.includes(".webp")) {
    return;
  }
  if (!list.includes(value)) {
    list.push(value);
  }
}

function pushPhoto(list: string[], value: unknown) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) {
    return;
  }
  if (!list.includes(value)) {
    list.push(value);
  }
}

function decodeJsonUrl(raw: string) {
  try {
    return JSON.parse(raw) as string;
  } catch {
    return raw.replace(/^"|"$/g, "").replace(/\\\//g, "/").replace(/\\u0026/gi, "&");
  }
}

async function fetchText(rawUrl: string, headers: Record<string, string>, redirect: RequestRedirect = "follow") {
  const parsed = await assertPublicHttpUrl(rawUrl);
  const response = await fetch(parsed.href, {
    headers,
    redirect,
    signal: AbortSignal.timeout(20_000),
  });
  const location = response.headers.get("location");
  if (redirect === "manual" && location && [301, 302, 303, 307, 308].includes(response.status)) {
    return { ok: response.ok, status: response.status, text: "", location: new URL(location, parsed.href).href };
  }
  if (!response.ok || !response.body) {
    return { ok: false, status: response.status, text: "", location: null as string | null };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > HTML_MAX) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return {
    ok: true,
    status: response.status,
    text: Buffer.concat(chunks).toString("utf8"),
    location: null as string | null,
  };
}

function instagramShortcode(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    if (!IG_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    if (/\/stories\//i.test(parsed.pathname)) {
      throw new Error("Instagram hikâyeleri alınamaz.");
    }
    return (
      parsed.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i)?.[1] ??
      parsed.pathname.match(/\/share\/(?:p|reel|reels)?\/?([A-Za-z0-9_-]+)/i)?.[1] ??
      null
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("hikâye")) {
      throw error;
    }
    return null;
  }
}

function facebookTarget(raw: string) {
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname.toLowerCase();
    if (!FB_HOSTS.has(host)) {
      return null;
    }
    if (host === "fb.watch" || host === "www.fb.watch") {
      const code = parsed.pathname.replace(/\//g, "");
      return code ? { url: `https://fb.watch/${code}`, id: code } : null;
    }
    const reel = parsed.pathname.match(/\/reel\/(\d+)/i)?.[1];
    if (reel) {
      return { url: `https://www.facebook.com/reel/${reel}`, id: reel };
    }
    const videos = parsed.pathname.match(/\/videos\/(\d+)/i)?.[1];
    if (videos) {
      return { url: `https://www.facebook.com/watch/?v=${videos}`, id: videos };
    }
    const watch = parsed.searchParams.get("v");
    if (watch && /^\d+$/.test(watch)) {
      return { url: `https://www.facebook.com/watch/?v=${watch}`, id: watch };
    }
    const share = parsed.pathname.match(/\/share\/([vr])\/([^/]+)/i);
    if (share) {
      return { url: `https://www.facebook.com/share/${share[1]}/${share[2]}`, id: share[2] };
    }
    return { url: parsed.href, id: parsed.pathname.replace(/\W+/g, "").slice(-16) || "facebook" };
  } catch {
    return null;
  }
}

function extractFromHtml(html: string) {
  const videos: string[] = [];
  const photos: string[] = [];
  const videoKeys = [
    /"browser_native_hd_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"browser_native_sd_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"playable_url_quality_hd"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"playable_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"video_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
  ];
  for (const pattern of videoKeys) {
    for (const match of html.matchAll(pattern)) {
      pushHttp(videos, decodeJsonUrl(`"${match[1]}"`));
    }
  }
  const ogVideo = html.match(
    /<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (ogVideo) {
    pushHttp(videos, ogVideo.replace(/&amp;/g, "&"));
  }
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (ogImage && !/profile|s150x150/i.test(ogImage)) {
    pushPhoto(photos, ogImage.replace(/&amp;/g, "&"));
  }
  return { videos, photos };
}

function collectMobileItem(item: Record<string, unknown> | null) {
  const videos: string[] = [];
  const photos: string[] = [];
  if (!item) {
    return { videos, photos };
  }
  const versions = Array.isArray(item.video_versions) ? item.video_versions : [];
  const ranked = versions
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .sort((a, b) => Number(b.width ?? 0) * Number(b.height ?? 0) - Number(a.width ?? 0) * Number(a.height ?? 0));
  for (const row of ranked) {
    pushHttp(videos, row.url);
  }
  const image = asRecord(item.image_versions2);
  const candidates = Array.isArray(image?.candidates) ? image.candidates : [];
  const first = asRecord(candidates[0]);
  pushPhoto(photos, first?.url);
  const carousel = Array.isArray(item.carousel_media) ? item.carousel_media : [];
  for (const child of carousel) {
    const nested = collectMobileItem(asRecord(child));
    nested.videos.forEach((url) => pushHttp(videos, url));
    nested.photos.forEach((url) => pushPhoto(photos, url));
  }
  return { videos, photos };
}

function collectGraphql(data: Record<string, unknown> | null) {
  const videos: string[] = [];
  const photos: string[] = [];
  const media =
    asRecord(data?.xdt_shortcode_media) ?? asRecord(data?.shortcode_media) ?? asRecord(asRecord(data?.data)?.xdt_shortcode_media);
  if (!media) {
    return { videos, photos };
  }
  pushHttp(videos, media.video_url);
  pushPhoto(photos, media.display_url);
  const sidecar = asRecord(media.edge_sidecar_to_children);
  const edges = Array.isArray(sidecar?.edges) ? sidecar.edges : [];
  for (const edge of edges) {
    const node = asRecord(asRecord(edge)?.node);
    if (!node) {
      continue;
    }
    pushHttp(videos, node.video_url);
    pushPhoto(photos, node.display_url);
  }
  return { videos, photos };
}

async function resolveShareRedirect(raw: string) {
  const hop = await fetchText(raw, { "User-Agent": "curl/8.4.0" }, "manual");
  if (hop.location) {
    return hop.location;
  }
  const followed = await fetchText(raw, {
    "User-Agent": BROWSER_UA,
    Accept: "text/html",
  });
  const canonical = followed.text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  return canonical || raw;
}

async function instagramMediaId(shortcode: string) {
  const oembed = await fetchText(`https://i.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${shortcode}/`, {
    "User-Agent": MOBILE_IG_UA,
    "x-ig-app-id": IG_APP_ID,
  });
  if (!oembed.ok) {
    return null;
  }
  try {
    const payload = JSON.parse(oembed.text) as { media_id?: string };
    return payload.media_id ?? null;
  } catch {
    return null;
  }
}

async function instagramMobile(mediaId: string) {
  const info = await fetchText(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, {
    "User-Agent": MOBILE_IG_UA,
    "x-ig-app-id": IG_APP_ID,
    Accept: "application/json",
  });
  if (!info.ok) {
    return { videos: [] as string[], photos: [] as string[] };
  }
  try {
    const payload = JSON.parse(info.text) as { items?: unknown[] };
    return collectMobileItem(asRecord(payload.items?.[0]));
  } catch {
    return { videos: [] as string[], photos: [] as string[] };
  }
}

async function instagramEmbed(shortcode: string) {
  const page = await fetchText(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
    Accept: "text/html,application/xhtml+xml",
    "User-Agent": BROWSER_UA,
  });
  if (!page.ok) {
    return { videos: [] as string[], photos: [] as string[] };
  }
  const init = page.text.match(/"init",\[\],\[(.*?)\]\],/);
  if (init?.[1]) {
    try {
      const embed = JSON.parse(init[1]) as { contextJSON?: string };
      if (embed.contextJSON) {
        const context = JSON.parse(embed.contextJSON) as Record<string, unknown>;
        const gql = collectGraphql(context);
        if (gql.videos.length || gql.photos.length) {
          return gql;
        }
      }
    } catch {
      /* HTML regex below */
    }
  }
  return extractFromHtml(page.text);
}

async function instagramGraphql(shortcode: string) {
  const home = await fetchText(`https://www.instagram.com/p/${shortcode}/`, {
    Accept: "text/html",
    "User-Agent": BROWSER_UA,
  });
  const lsd =
    home.text.match(/\["LSD",\[\],\{"token":"([^"]+)"\}/)?.[1] ??
    home.text.match(/"lsd"\s*:\s*"([^"]+)"/)?.[1] ??
    "";
  const csrf = home.text.match(/"csrf_token":"([^"]+)"/)?.[1] ?? "";
  const parsed = await assertPublicHttpUrl("https://www.instagram.com/graphql/query");
  const response = await fetch(parsed.href, {
    method: "POST",
    headers: {
      "User-Agent": BROWSER_UA,
      "content-type": "application/x-www-form-urlencoded",
      "x-ig-app-id": IG_APP_ID,
      "X-FB-LSD": lsd,
      "X-CSRFToken": csrf,
      "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
      Referer: `https://www.instagram.com/p/${shortcode}/`,
    },
    body: new URLSearchParams({
      lsd,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
      variables: JSON.stringify({
        shortcode,
        fetch_tagged_user_count: null,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
      }),
      server_timestamps: "true",
      doc_id: "8845758582119845",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return collectGraphql(asRecord(payload?.data) ?? payload);
}

async function instagramMirror(shortcode: string) {
  const mirrors = [
    `https://www.ddinstagram.com/p/${shortcode}`,
    `https://kkinstagram.com/p/${shortcode}`,
  ];
  for (const url of mirrors) {
    try {
      const page = await fetchText(url, {
        Accept: "text/html",
        "User-Agent": BROWSER_UA,
      });
      const found = extractFromHtml(page.text);
      if (found.videos.length) {
        return found;
      }
    } catch {
      /* next mirror */
    }
  }
  return { videos: [] as string[], photos: [] as string[] };
}

async function resolveInstagram(raw: string): Promise<SocialMedia> {
  let url = raw.trim();
  if (/\/share\//i.test(url)) {
    url = await resolveShareRedirect(url);
  }
  const shortcode = instagramShortcode(url);
  if (!shortcode) {
    throw new Error("Instagram bağlantısı tanınmadı.");
  }
  const videos: string[] = [];
  const photos: string[] = [];
  const merge = (part: { videos: string[]; photos: string[] }) => {
    part.videos.forEach((item) => pushHttp(videos, item));
    part.photos.forEach((item) => pushPhoto(photos, item));
  };
  try {
    const mediaId = await instagramMediaId(shortcode);
    if (mediaId) {
      merge(await instagramMobile(mediaId));
    }
  } catch {
    /* next */
  }
  if (!videos.length) {
    try {
      merge(await instagramEmbed(shortcode));
    } catch {
      /* next */
    }
  }
  if (!videos.length) {
    try {
      merge(await instagramGraphql(shortcode));
    } catch {
      /* next */
    }
  }
  if (!videos.length) {
    merge(await instagramMirror(shortcode));
  }
  if (!videos.length && !photos.length) {
    throw new Error("Instagram gönderisi okunamadı. Herkese açık bir video olmalı.");
  }
  return {
    kind: "instagram",
    id: shortcode,
    referer: "https://www.instagram.com/",
    videos,
    photos,
  };
}

async function resolveFacebook(raw: string): Promise<SocialMedia> {
  const target = facebookTarget(raw);
  if (!target) {
    throw new Error("Facebook bağlantısı tanınmadı.");
  }
  let url = target.url;
  if (/fb\.watch|\/share\//i.test(url)) {
    url = await resolveShareRedirect(url);
  }
  const page = await fetchText(url, {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.5",
    "User-Agent": BROWSER_UA,
    "Sec-Fetch-Mode": "navigate",
  });
  if (!page.ok) {
    throw new Error("Facebook gönderisi okunamadı. Video herkese açık olmalı.");
  }
  const found = extractFromHtml(page.text);
  if (!found.videos.length) {
    throw new Error("Facebook videosu bulunamadı. Yalnızca herkese açık videolar alınır.");
  }
  return {
    kind: "facebook",
    id: target.id,
    referer: "https://www.facebook.com/",
    videos: found.videos,
    photos: found.photos,
  };
}

async function resolveViaCobalt(raw: string): Promise<SocialMedia | null> {
  const base = process.env.COBALT_API_URL?.replace(/\/$/, "");
  if (!base) {
    return null;
  }
  const endpoint = await assertPublicHttpUrl(`${base}/`);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const key = process.env.COBALT_API_KEY?.trim();
  if (key) {
    headers.Authorization = `Api-Key ${key}`;
  }
  const response = await fetch(endpoint.href, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: raw, videoQuality: "720", downloadMode: "auto" }),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!payload) {
    return null;
  }
  const videos: string[] = [];
  const photos: string[] = [];
  if (payload.status === "tunnel" || payload.status === "redirect") {
    pushHttp(videos, payload.url);
  }
  if (payload.status === "picker" && Array.isArray(payload.picker)) {
    for (const item of payload.picker) {
      const row = asRecord(item);
      if (row?.type === "video") {
        pushHttp(videos, row.url);
      } else {
        pushPhoto(photos, row?.url);
      }
    }
  }
  if (!videos.length && !photos.length) {
    return null;
  }
  const kind = socialKindFromUrl(raw) ?? "instagram";
  return {
    kind,
    id: "cobalt",
    referer: kind === "facebook" ? "https://www.facebook.com/" : "https://www.instagram.com/",
    videos,
    photos,
  };
}

export async function resolveSocialMedia(raw: string): Promise<SocialMedia | null> {
  const kind = socialKindFromUrl(raw);
  if (!kind) {
    return null;
  }
  try {
    return kind === "instagram" ? await resolveInstagram(raw) : await resolveFacebook(raw);
  } catch (error) {
    const fallback = await resolveViaCobalt(raw).catch(() => null);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

export function pickSocialVideo(videos: string[]) {
  return videos[0] ?? null;
}

const STORE = "imgbg-media-v1";
const SEEN_KEY = "imgbg-media-seen";
const seen = new Set<string>(readSeen());
const preloaded = new Set<string>();

function readSeen(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(-2000) : [];
  } catch {
    return [];
  }
}

function persistSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-2000)));
  } catch {
    /* kota */
  }
}

export function mediaWasShown(url: string) {
  return seen.has(url);
}

export function markMediaShown(url: string) {
  if (!url || seen.has(url)) {
    return;
  }
  seen.add(url);
  persistSeen();
}

export function prefetchMedia(url: string) {
  if (!url || preloaded.has(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return;
  }
  preloaded.add(url);
  if (typeof document === "undefined") {
    return;
  }
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  document.head.appendChild(link);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export async function objectUrlFromCache(url: string) {
  if (!url || typeof caches === "undefined") {
    return null;
  }
  try {
    const cache = await caches.open(STORE);
    const hit = await cache.match(url);
    if (!hit) {
      return null;
    }
    const blob = await hit.blob();
    if (!blob.size) {
      return null;
    }
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function warmMedia(url: string) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
    return;
  }
  markMediaShown(url);
  prefetchMedia(url);
  if (typeof caches === "undefined") {
    return;
  }
  try {
    const cache = await caches.open(STORE);
    if (await cache.match(url)) {
      return;
    }
    const local = url.startsWith("/") || url.startsWith(window.location.origin);
    const response = await fetch(url, {
      mode: local ? "same-origin" : "cors",
      credentials: "omit",
      cache: "force-cache",
    });
    if (response.ok) {
      await cache.put(url, response.clone());
    }
  } catch {
    /* service worker / HTTP önbelleği yeter */
  }
}

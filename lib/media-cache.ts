const STORE = "imgbg-media-v1";
const seen = new Set<string>();

export function mediaWasShown(url: string) {
  return seen.has(url);
}

export function markMediaShown(url: string) {
  seen.add(url);
}

export async function warmMedia(url: string) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
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
    /* tarayıcı HTTP önbelleği yeter */
  }
}

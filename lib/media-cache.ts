const STORE = "imgbg-media-v1";

export async function rememberMedia(url: string) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  try {
    const cache = await caches.open(STORE);
    const hit = await cache.match(url);
    if (hit) {
      return URL.createObjectURL(await hit.blob());
    }
    const local = url.startsWith("/") || url.startsWith(window.location.origin);
    const response = await fetch(url, {
      mode: local ? "same-origin" : "cors",
      credentials: "omit",
      cache: "force-cache",
    });
    if (!response.ok) {
      return url;
    }
    await cache.put(url, response.clone());
    return URL.createObjectURL(await response.blob());
  } catch {
    return url;
  }
}

const STORE = "imgbg-media-v1";

function isMediaRequest(request) {
  if (request.method !== "GET") {
    return false;
  }
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/")) {
    return false;
  }
  if (url.pathname.startsWith("/api/media/") || url.pathname.startsWith("/api/thumb/")) {
    return true;
  }
  if (url.hostname === "cdn.imgbg.net" || url.hostname.endsWith(".r2.dev") || url.hostname.includes("r2.cloudflarestorage.com")) {
    return true;
  }
  if (request.destination === "image" || request.destination === "video") {
    return url.pathname.includes("/uploads/");
  }
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!isMediaRequest(event.request)) {
    return;
  }
  event.respondWith(
    caches.open(STORE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }
      const response = await fetch(event.request);
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(event.request, response.clone()).catch(() => undefined);
      }
      return response;
    }),
  );
});

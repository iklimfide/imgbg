const STORE = "imgbg-seen-links";
const MAX_SEEN = 4000;

export function normalizeHttpUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol}//${host}${path}${url.search}`;
  } catch {
    return raw.trim();
  }
}

export function readSeenLinks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) ?? "[]") as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function rememberSeenLinks(urls: string[]) {
  const next = readSeenLinks();
  for (const url of urls) {
    const key = normalizeHttpUrl(url);
    if (key) {
      next.add(key);
    }
  }
  const list = [...next];
  const trimmed = list.length > MAX_SEEN ? list.slice(list.length - MAX_SEEN) : list;
  try {
    localStorage.setItem(STORE, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ALLOWED_TYPES } from "@/lib/site";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.internal",
]);

export function sniffMime(buf: Buffer, headerType: string | null) {
  const header = headerType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_TYPES[header]) {
    return header;
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.length >= 8 && buf.toString("ascii", 4, 8) === "ftyp") {
    return "video/mp4";
  }
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

export function filenameFromUrl(url: string, mime: string) {
  try {
    const path = new URL(url).pathname;
    const base = decodeURIComponent(path.split("/").pop() || "");
    if (base && /\.[a-z0-9]{2,5}$/i.test(base)) {
      return base.slice(0, 80);
    }
  } catch {
    /* ignore */
  }
  const ext = ALLOWED_TYPES[mime]?.ext ?? "bin";
  return `link.${ext}`;
}

function isPrivateIp(ip: string) {
  const value = ip.replace(/^::ffff:/i, "").toLowerCase();
  if (value === "::1" || value === "::" || value === "0.0.0.0") {
    return true;
  }
  if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  return false;
}

export async function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Geçerli bir bağlantı yaz.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Sadece http veya https bağlantıları kullanılabilir.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Bu bağlantı kullanılamaz.");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Bu bağlantı kullanılamaz.");
  }
  const ips = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((entry) => entry.address);
  if (ips.length === 0 || ips.some(isPrivateIp)) {
    throw new Error("Bu bağlantı kullanılamaz.");
  }
  return parsed;
}

const HTML_SNIFF_BYTES = 1_048_576;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isHtmlPayload(buf: Buffer, contentType: string | null) {
  const type = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "text/html" || type === "application/xhtml+xml") {
    return true;
  }
  const head = buf
    .subarray(0, 512)
    .toString("latin1")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}

function unescapeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function imageUrlFromSharePage(html: string, base: string) {
  const patterns = [
    /<meta\b[^>]*\bproperty\s*=\s*["']og:image["'][^>]*\bcontent\s*=\s*["']([^"']+)["']/i,
    /<meta\b[^>]*\bcontent\s*=\s*["']([^"']+)["'][^>]*\bproperty\s*=\s*["']og:image["']/i,
    /<meta\b[^>]*\bname\s*=\s*["']twitter:image(?::src)?["'][^>]*\bcontent\s*=\s*["']([^"']+)["']/i,
    /<meta\b[^>]*\bcontent\s*=\s*["']([^"']+)["'][^>]*\bname\s*=\s*["']twitter:image(?::src)?["']/i,
    /<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i,
    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']image_src["']/i,
  ];
  for (const pattern of patterns) {
    const raw = html.match(pattern)?.[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const href = new URL(unescapeHtml(raw), base).href;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        return href;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function fetchPublicBuffer(rawUrl: string, maxBytes: number, referer?: string) {
  let current = rawUrl.trim();
  for (let hop = 0; hop < 4; hop += 1) {
    const parsed = await assertPublicHttpUrl(current);
    const headers: Record<string, string> = {
      Accept: "image/*,video/*,text/html;q=0.9,*/*;q=0.8",
      "User-Agent": BROWSER_UA,
    };
    if (referer) {
      headers.Referer = referer;
    }
    const response = await fetch(parsed.href, {
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Bağlantı yönlendirmesi okunamadı.");
      }
      current = new URL(location, parsed.href).href;
      continue;
    }
    if (!response.ok || !response.body) {
      throw new Error("Dosya bu adresten alınamadı.");
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > maxBytes) {
      throw new Error("Dosya çok büyük.");
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
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Dosya çok büyük.");
      }
      chunks.push(value);
    }
    return {
      buf: Buffer.concat(chunks),
      contentType: response.headers.get("content-type"),
      url: parsed.href,
    };
  }
  throw new Error("Çok fazla yönlendirme.");
}

export async function inspectRemoteMedia(rawUrl: string, maxBytes: number, referer?: string) {
  const first = await fetchPublicBuffer(rawUrl, maxBytes, referer);
  const mime = sniffMime(first.buf, first.contentType);
  if (mime) {
    return {
      buf: first.buf,
      mime,
      url: first.url,
      referer: undefined as string | undefined,
      name: filenameFromUrl(first.url, mime),
    };
  }
  if (!isHtmlPayload(first.buf, first.contentType)) {
    throw new Error("Bu adres doğrudan bir resim veya video değil.");
  }
  const html = first.buf.subarray(0, HTML_SNIFF_BYTES).toString("utf8");
  const embedded = imageUrlFromSharePage(html, first.url);
  if (!embedded) {
    throw new Error("Bu adres bir paylaşım sayfası; içindeki resim bulunamadı.");
  }
  return {
    buf: null as Buffer | null,
    mime: null as string | null,
    url: embedded,
    referer: first.url,
    name: filenameFromUrl(embedded, "image/jpeg"),
  };
}

export async function materializeRemoteMedia(
  inspected: Awaited<ReturnType<typeof inspectRemoteMedia>>,
  maxBytes: number,
) {
  if (inspected.buf && inspected.mime) {
    return { buf: inspected.buf, mime: inspected.mime, url: inspected.url };
  }
  const file = await fetchPublicBuffer(inspected.url, maxBytes, inspected.referer);
  const fileMime = sniffMime(file.buf, file.contentType);
  if (!fileMime) {
    throw new Error("Bu adres doğrudan bir resim veya video değil.");
  }
  return { buf: file.buf, mime: fileMime, url: file.url };
}

export async function downloadPublicMedia(rawUrl: string, maxBytes: number, referer?: string) {
  return materializeRemoteMedia(await inspectRemoteMedia(rawUrl, maxBytes, referer), maxBytes);
}

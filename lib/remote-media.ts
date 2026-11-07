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

export async function downloadPublicMedia(rawUrl: string, maxBytes: number) {
  let current = rawUrl.trim();
  for (let hop = 0; hop < 4; hop += 1) {
    const parsed = await assertPublicHttpUrl(current);
    const response = await fetch(parsed.href, {
      redirect: "manual",
      headers: {
        Accept: "image/*,video/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
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
    const buf = Buffer.concat(chunks);
    const mime = sniffMime(buf, response.headers.get("content-type"));
    if (!mime) {
      throw new Error("Bu adres doğrudan bir resim veya video değil.");
    }
    return { buf, mime, url: parsed.href };
  }
  throw new Error("Çok fazla yönlendirme.");
}

import { downloadPublicMedia, filenameFromUrl, inspectRemoteMedia, materializeRemoteMedia } from "@/lib/remote-media";
import { isAdminEmail } from "@/lib/admin";
import { findExistingUpload } from "@/lib/existing-upload";
import { fileLimit, formatMb } from "@/lib/quota";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { ALLOWED_TYPES, parseMediaKind, type MediaKind } from "@/lib/site";
import { guestKeyFromRequest } from "@/lib/posts";
import { pickSocialVideo, resolveSocialMedia, socialKindFromUrl } from "@/lib/social-video";
import { pickTwitterVideo, resolveTwitterMedia, tweetIdFromUrl } from "@/lib/twitter-media";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user ?? null;
  const isMember = Boolean(user);
  const isAdmin = isAdminEmail(user?.email);
  const guestKey = isMember ? null : guestKeyFromRequest(request);
  const limitKey = isMember ? `fetch:user:${user!.id}` : `fetch:guest:${guestKey}`;
  if (!isAdmin && !rateLimit(limitKey, isMember ? 400 : 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Çok fazla deneme. Biraz bekleyip tekrar dene." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { url?: string; kind?: string } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (body?.kind === "audio") {
    return Response.json(
      { error: "Ses için bağlantı kullanılamaz. Kaydı cihazından al." },
      { status: 400 },
    );
  }
  if (!url) {
    return Response.json({ error: "Bir bağlantı yaz." }, { status: 400 });
  }
  const kind = parseMediaKind(body?.kind ?? "image");
  const maxBytes = fileLimit(isMember, kind, isAdmin);
  try {
    if (tweetIdFromUrl(url)) {
      return await twitterResponse({ url, kind, maxBytes, userId: user?.id, guestKey });
    }
    if (socialKindFromUrl(url)) {
      return await socialResponse({ url, kind, maxBytes, userId: user?.id, guestKey });
    }
    if (kind === "video") {
      const file = await downloadPublicMedia(url, maxBytes);
      return await fileResponse(file, kind, user?.id, guestKey);
    }
    const inspected = await inspectRemoteMedia(url, maxBytes);
    const existing = await findExistingUpload({
      userId: user?.id,
      guestKey,
      name: inspected.name,
      size: inspected.buf?.length,
      kind,
    });
    if (existing) {
      return Response.json({ skipped: true, name: inspected.name, kod: existing.id });
    }
    const file = await materializeRemoteMedia(inspected, maxBytes);
    return await fileResponse(file, kind, user?.id, guestKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dosya alınamadı.";
    if (message.includes("çok büyük")) {
      return Response.json(
        { error: `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(maxBytes)}MB` },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}

async function socialResponse(params: {
  url: string;
  kind: MediaKind;
  maxBytes: number;
  userId?: string;
  guestKey: string | null;
}) {
  const media = await resolveSocialMedia(params.url);
  if (!media) {
    return Response.json({ error: "Instagram veya Facebook bağlantısı okunamadı." }, { status: 400 });
  }
  const label = media.kind === "facebook" ? "Facebook" : "Instagram";
  if (params.kind === "video") {
    const pick = pickSocialVideo(media.videos);
    if (!pick) {
      return Response.json(
        { error: `Bu gönderide video yok. Resim varsa Resim yükle sekmesinden dene.` },
        { status: 400 },
      );
    }
    const file = await downloadPublicMedia(pick.url, params.maxBytes, media.referer);
    return fileResponse(file, "video", params.userId, params.guestKey);
  }
  const photo = media.photos[0];
  if (!photo) {
    return Response.json(
      { error: `Bu ${label} gönderisinde resim yok. Video varsa Video yükle sekmesinden ekle.` },
      { status: 400 },
    );
  }
  const file = await downloadPublicMedia(photo, params.maxBytes, media.referer);
  return fileResponse(file, "image", params.userId, params.guestKey);
}

async function twitterResponse(params: {
  url: string;
  kind: MediaKind;
  maxBytes: number;
  userId?: string;
  guestKey: string | null;
}) {
  const media = await resolveTwitterMedia(params.url);
  if (!media) {
    return Response.json({ error: "Twitter/X bağlantısı okunamadı." }, { status: 400 });
  }
  if (params.kind === "video") {
    const pick = pickTwitterVideo(media.videos, params.maxBytes);
    if (!pick) {
      return Response.json(
        { error: "Bu gönderide video yok. Resim varsa Resim yükle sekmesinden dene." },
        { status: 400 },
      );
    }
    const file = await downloadPublicMedia(pick.url, params.maxBytes);
    return fileResponse(file, "video", params.userId, params.guestKey);
  }
  const photo = media.photos[0];
  if (!photo) {
    return Response.json(
      { error: "Bu gönderide resim yok. Video varsa Video yükle sekmesinden ekle." },
      { status: 400 },
    );
  }
  const file = await downloadPublicMedia(photo, params.maxBytes);
  return fileResponse(file, "image", params.userId, params.guestKey);
}

async function fileResponse(
  file: { buf: Buffer; mime: string; url: string },
  kind: MediaKind,
  userId: string | undefined,
  guestKey: string | null,
) {
  const meta = ALLOWED_TYPES[file.mime];
  if (!meta || meta.type !== kind) {
    return Response.json(
      {
        error:
          kind === "video"
            ? "Bu adres bir video değil."
            : "Bu adres bir resim değil. Video ve paylaşım sayfası linkleri eklenmez.",
      },
      { status: 400 },
    );
  }
  const name = filenameFromUrl(file.url, file.mime);
  const existing = await findExistingUpload({
    userId,
    guestKey,
    name,
    size: file.buf.length,
    kind,
  });
  if (existing) {
    return Response.json({ skipped: true, name, kod: existing.id });
  }
  return new Response(Uint8Array.from(file.buf), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      "X-File-Name": encodeURIComponent(name),
    },
  });
}

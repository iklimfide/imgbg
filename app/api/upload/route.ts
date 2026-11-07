import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { toWebp } from "@/lib/convert-image";
import { hashSharePassword } from "@/lib/password";
import { guestKeyFromRequest, usedStorage } from "@/lib/posts";
import { fileLimit, formatMb, resolveExpiry, storageLimit, ttlLabel } from "@/lib/quota";
import { isAdminEmail } from "@/lib/admin";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { createShortCode } from "@/lib/short-code";
import { makeDeleteToken } from "@/lib/unlock";
import { ALLOWED_TYPES, mimeFromFileName, parseMediaKind } from "@/lib/site";

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user ?? null;
  const isMember = Boolean(user);
  const isAdmin = isAdminEmail(user?.email);
  const guestKey = isMember ? null : guestKeyFromRequest(request);

  if (!isR2Configured()) {
    return Response.json(
      { error: "Cloudflare R2 henüz ayarlanmadı. .env.local dosyasını kontrol et." },
      { status: 503 },
    );
  }

  const limitKey = isMember ? `upload:user:${user!.id}` : `upload:guest:${guestKey}`;
  const maxUploads = isMember ? 40 : 25;
  if (!isAdmin && !rateLimit(limitKey, maxUploads, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Çok fazla yükleme. Biraz bekleyip tekrar dene." },
      { status: 429 },
    );
  }

  if (!isAdmin) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    const maxBody = fileLimit(isMember, "video") + 5 * 1024 * 1024;
    if (contentLength > maxBody) {
      return Response.json(
        { error: `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(fileLimit(isMember, "video"))}MB` },
        { status: 400 },
      );
    }
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = parseMediaKind(form.get("kind"));
  const ttl = typeof form.get("ttl") === "string" ? String(form.get("ttl")) : "1d";
  const password = typeof form.get("password") === "string" ? String(form.get("password")).trim() : "";
  if (password && (password.length < 4 || password.length > 64)) {
    return Response.json({ error: "Şifre 4-64 karakter olmalı." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Dosya seçilmedi." }, { status: 400 });
  }

  const mimeHint = file.type || mimeFromFileName(file.name);
  const meta = ALLOWED_TYPES[mimeHint];
  if (!meta) {
    return Response.json(
      {
        error:
          kind === "video"
            ? "Bu sayfada sadece MP4 ve WebM yükleyebilirsin."
            : kind === "audio"
              ? "Bu sayfada MP3, WAV, OGG, M4A, AAC, FLAC veya WebM ses yükleyebilirsin."
              : "Bu sayfada sadece JPEG, PNG, WebP ve GIF yükleyebilirsin.",
      },
      { status: 400 },
    );
  }
  if (meta.type !== kind) {
    return Response.json(
      {
        error:
          meta.type === "image"
            ? "Resim dosyasını resim yükle sekmesinden gönder."
            : meta.type === "video"
              ? "Video dosyasını video yükle sekmesinden gönder."
              : "Ses dosyasını ses yükle sekmesinden gönder.",
      },
      { status: 400 },
    );
  }

  const maxBytes = fileLimit(isMember, meta.type, isAdmin);
  if (Number.isFinite(maxBytes) && file.size > maxBytes) {
    return Response.json(
      { error: `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(maxBytes)}MB` },
      { status: 400 },
    );
  }

  const used = await usedStorage(
    isMember ? { userId: user!.id } : { guestKey: guestKey! },
  );
  const cap = storageLimit(isMember, isAdmin);

  const original = Buffer.from(await file.arrayBuffer());
  let body: Buffer = original;
  let mime = mimeHint;
  let ext = meta.ext;

  if (meta.type === "image") {
    const converted = await toWebp(original);
    if (converted !== original) {
      body = Buffer.from(converted);
      mime = "image/webp";
      ext = "webp";
    }
  }

  const storeSize = body.byteLength;
  if (Number.isFinite(cap) && used + storeSize > cap) {
    const hint = isMember
      ? ` Üye kotan ${formatMb(cap)} MB.`
      : ` Misafir kotası ${formatMb(cap)} MB. Üye olunca 2 GB kalıcı alanın olur.`;
    return Response.json({ error: `Depolama dolu.${hint}` }, { status: 400 });
  }

  const kod = await createShortCode();
  const folder = isMember ? user!.id : `guest/${guestKey}`;
  const r2Key = `uploads/${folder}/${kod}.${ext}`;

  await uploadToR2(r2Key, body, mime);

  const expiresAt = resolveExpiry(isMember, ttl, meta.type);

  const db = await getDb();
  await db
    .insert(posts)
    .values({
      id: kod,
      userId: user?.id ?? null,
      guestKey,
      type: meta.type,
      r2Key,
      mime,
      size: storeSize,
      originalName: file.name,
      passwordHash: password ? hashSharePassword(password) : null,
      expiresAt,
      createdAt: new Date(),
    });

  return Response.json({
    kod,
    deleteToken: makeDeleteToken(kod),
    protected: Boolean(password),
    permanent: !expiresAt,
    expiresAt: expiresAt?.toISOString() ?? null,
    ttlLabel: ttlLabel(isMember || ttl !== "forever" ? ttl : "1y", meta.type),
  });
}

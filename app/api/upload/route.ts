import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { hashSharePassword } from "@/lib/password";
import { guestKeyFromRequest, usedStorage } from "@/lib/posts";
import { fileLimit, formatMb, resolveExpiry, storageLimit, ttlLabel } from "@/lib/quota";
import { ensureR2Cors, headFromR2, isR2Configured, signedPutUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { createShortCode } from "@/lib/short-code";
import { ALLOWED_TYPES, mimeFromFileName, parseMediaKind } from "@/lib/site";
import { makeDeleteToken } from "@/lib/unlock";

export const maxDuration = 60;

type PrepareBody = {
  step?: string;
  kind?: string;
  ttl?: string;
  password?: string;
  name?: string;
  size?: number;
  mime?: string;
  kod?: string;
};

type Ctx = {
  user: { id: string } | null;
  isMember: boolean;
  isAdmin: boolean;
  guestKey: string | null;
};

function guestKeyFromHeaders(headerList: Headers) {
  const forwarded = headerList.get("x-forwarded-for");
  const fake = new Request("http://local", {
    headers: {
      "x-forwarded-for": forwarded ?? "",
      "x-real-ip": headerList.get("x-real-ip") ?? "",
    },
  });
  return guestKeyFromRequest(fake);
}

function resolveMime(mime: string | undefined, name: string) {
  const hint = (mime ?? "").split(";")[0].trim().toLowerCase();
  return ALLOWED_TYPES[hint] ? hint : mimeFromFileName(name);
}

function jsonError(code: string, error: string, status = 400) {
  return Response.json({ error, code, status }, { status });
}

function failMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Yükleme başarısız.";
}

export async function POST(request: Request) {
  try {
    if (!isR2Configured()) {
      return jsonError(
        "R2_ENV",
        "Cloudflare R2 henüz ayarlanmadı. Vercel env içine R2 anahtarlarını yaz.",
        503,
      );
    }

    const session = await getSession();
    const user = session?.user ?? null;
    const isMember = Boolean(user);
    const isAdmin = isAdminEmail(user?.email);
    const guestKey = isMember ? null : guestKeyFromHeaders(request.headers);
    const ctx: Ctx = { user, isMember, isAdmin, guestKey };

    const limitKey = isMember ? `upload:user:${user!.id}` : `upload:guest:${guestKey}`;
    if (!isAdmin && !rateLimit(limitKey, isMember ? 40 : 25, 10 * 60 * 1000)) {
      return jsonError("RATE", "Çok fazla yükleme. Biraz bekleyip tekrar dene.", 429);
    }

    const body = (await request.json().catch(() => null)) as PrepareBody | null;
    if (!body) {
      return jsonError("BAD_JSON", "İstek okunamadı.");
    }
    if (body.step === "complete") {
      return await completeUpload(body, ctx);
    }
    return await prepareUpload(body, ctx);
  } catch (cause) {
    return jsonError("UPLOAD_500", failMessage(cause), 500);
  }
}

async function prepareUpload(body: PrepareBody, ctx: Ctx) {
  const kind = parseMediaKind(body.kind ?? "image");
  const mimeHint = resolveMime(body.mime, String(body.name ?? ""));
  const meta = ALLOWED_TYPES[mimeHint];
  const size = Number(body.size ?? 0);
  if (!meta || meta.type !== kind) {
    return jsonError("MIME", `Bu dosya bu sekmeye uygun değil. (${mimeHint || "boş tür"})`);
  }
  const maxBytes = fileLimit(ctx.isMember, meta.type, ctx.isAdmin);
  if (Number.isFinite(maxBytes) && size > maxBytes) {
    return jsonError("SIZE", `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(maxBytes)}MB`);
  }
  const used = await usedStorage(
    ctx.isMember ? { userId: ctx.user!.id } : { guestKey: ctx.guestKey! },
  ).catch(() => 0);
  const cap = storageLimit(ctx.isMember, ctx.isAdmin);
  if (Number.isFinite(cap) && used + size > cap) {
    return jsonError("QUOTA", "Depolama dolu.");
  }

  try {
    const kod = await createShortCode();
    const folder = ctx.isMember ? ctx.user!.id : `guest/${ctx.guestKey}`;
    const r2Key = `uploads/${folder}/${kod}.${meta.ext}`;
    await ensureR2Cors();
    const putUrl = await signedPutUrl(r2Key, mimeHint);
    return Response.json({ kod, r2Key, putUrl, mime: mimeHint, ext: meta.ext });
  } catch (cause) {
    return jsonError("PREPARE", failMessage(cause), 500);
  }
}

async function completeUpload(body: PrepareBody, ctx: Ctx) {
  const kod = String(body.kod ?? "");
  if (!/^[a-z0-9]{8}$/.test(kod)) {
    return jsonError("KOD", "Kod geçersiz.");
  }
  const kind = parseMediaKind(body.kind ?? "image");
  const mimeHint = resolveMime(body.mime, String(body.name ?? ""));
  const meta = ALLOWED_TYPES[mimeHint];
  if (!meta || meta.type !== kind) {
    return jsonError("MIME", `Bu dosya bu sekmeye uygun değil. (${mimeHint || "boş tür"})`);
  }
  const ttl = typeof body.ttl === "string" ? body.ttl : "1d";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (password && (password.length < 4 || password.length > 64)) {
    return jsonError("PASSWORD", "Şifre 4-64 karakter olmalı.");
  }

  const folder = ctx.isMember ? ctx.user!.id : `guest/${ctx.guestKey}`;
  const r2Key = `uploads/${folder}/${kod}.${meta.ext}`;
  const head = await headFromR2(r2Key);
  if (!head || head.size < 1) {
    return jsonError("R2_HEAD", "Dosya R2'ye yazılamadı.");
  }

  const maxBytes = fileLimit(ctx.isMember, meta.type, ctx.isAdmin);
  if (Number.isFinite(maxBytes) && head.size > maxBytes) {
    return jsonError("SIZE", `Dosya boyutunuz çok büyük. İzin verilen ${formatMb(maxBytes)}MB`);
  }

  try {
    const expiresAt = resolveExpiry(ctx.isMember, ttl, meta.type);
    const db = await getDb();
    await db.insert(posts).values({
      id: kod,
      userId: ctx.user?.id ?? null,
      guestKey: ctx.guestKey,
      type: meta.type,
      r2Key,
      mime: mimeHint,
      size: head.size,
      originalName: typeof body.name === "string" ? body.name : null,
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
      ttlLabel: ttlLabel(ctx.isMember || ttl !== "forever" ? ttl : "1y", meta.type),
    });
  } catch (cause) {
    return jsonError("COMPLETE", failMessage(cause), 500);
  }
}

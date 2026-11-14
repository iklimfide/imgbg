import { isAdminEmail } from "@/lib/admin";
import { getPost, isPubliclyVisible } from "@/lib/posts";
import { getFromR2, headFromR2, isR2Configured, publicMediaUrl, signedGetUrl, thumbR2Key } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { saveThumbBytes } from "@/lib/thumb";
import { hasUnlocked } from "@/lib/unlock";
import type { Post } from "@/db/schema";

export const maxDuration = 30;

async function canRead(post: Post) {
  const session = await getSession();
  const admin = isAdminEmail(session?.user?.email);
  const owner = Boolean(session?.user?.id && session.user.id === post.userId);
  if (!isPubliclyVisible(post) && !admin && !owner) {
    return { ok: false as const, status: 404, admin, owner };
  }
  if (post.passwordHash && !admin) {
    const unlocked = await hasUnlocked(post.id);
    if (!owner && !unlocked) {
      return { ok: false as const, status: 401, admin, owner };
    }
  }
  return { ok: true as const, admin, owner, session };
}

async function sendThumb(kod: string, key: string, passwordHash: string | null) {
  const publicUrl = publicMediaUrl(kod, key, Boolean(passwordHash));
  if (!passwordHash && publicUrl.startsWith("http")) {
    return Response.redirect(publicUrl, 302);
  }
  if (!passwordHash) {
    return Response.redirect(await signedGetUrl(key), 302);
  }
  const object = await getFromR2(key);
  if (!object.stream) {
    return new Response("Dosya yok", { status: 404 });
  }
  return new Response(object.stream, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=604800, stale-while-revalidate=2592000",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  if (!isR2Configured()) {
    return new Response("R2 ayarlı değil", { status: 503 });
  }
  const { kod } = await params;
  const post = await getPost(kod);
  if (!post || (post.type !== "image" && post.type !== "video")) {
    return new Response("Bulunamadı.", { status: 404 });
  }
  const access = await canRead(post);
  if (!access.ok) {
    return new Response("Bulunamadı.", { status: access.status });
  }
  try {
    const key = thumbR2Key(post.r2Key);
    const existing = await headFromR2(key);
    if (!existing || existing.size < 1) {
      return new Response("Yok", { status: 404 });
    }
    return await sendThumb(kod, key, post.passwordHash);
  } catch {
    return new Response("Küçük resim üretilemedi.", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  if (!isR2Configured()) {
    return Response.json({ error: "R2 ayarlı değil" }, { status: 503 });
  }
  const { kod } = await params;
  const post = await getPost(kod);
  if (!post || post.type !== "video") {
    return Response.json({ error: "Bulunamadı." }, { status: 404 });
  }
  const access = await canRead(post);
  if (!access.ok || (!access.admin && !access.owner && !isPubliclyVisible(post))) {
    return Response.json({ error: "Yetkisiz." }, { status: 403 });
  }
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.byteLength < 32 || buf.byteLength > 2_000_000) {
    return Response.json({ error: "Kare geçersiz." }, { status: 400 });
  }
  try {
    await saveThumbBytes(post.r2Key, buf);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Kaydedilemedi." }, { status: 500 });
  }
}

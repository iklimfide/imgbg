import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { hashSharePassword } from "@/lib/password";
import { getPost, setPostHidden, setPostTags, softDeletePost } from "@/lib/posts";
import { resolveExpiry } from "@/lib/quota";
import { getSession, requireUser } from "@/lib/session";
import { cleanTags } from "@/lib/tags";
import { isDeleteTokenValid } from "@/lib/unlock";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  const session = await getSession();
  const account = session?.user ?? null;
  const post = await getPost(kod);
  if (!post) {
    return Response.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  const admin = isAdminEmail(account?.email);
  const owner = Boolean(account && post.userId === account.id);
  if (!owner && !admin) {
    return Response.json({ error: "Bu dosyayı düzenleyemezsin." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    hidden?: boolean;
    tags?: unknown;
    originalName?: string;
    ttl?: string;
    password?: string;
    clearPassword?: boolean;
  } | null;
  if (!body) {
    return Response.json({ error: "İstek geçersiz." }, { status: 400 });
  }

  if ("tags" in body) {
    try {
      const tags = cleanTags(body.tags);
      await setPostTags(kod, tags);
      return Response.json({ ok: true, tags });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Etiket kaydedilemedi.";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  const patch: {
    hiddenAt?: Date | null;
    originalName?: string | null;
    passwordHash?: string | null;
    expiresAt?: Date | null;
  } = {};

  if (typeof body.hidden === "boolean") {
    if (!owner && !admin) {
      return Response.json({ error: "Bu dosyayı gizleyemezsin." }, { status: 403 });
    }
    patch.hiddenAt = body.hidden ? new Date() : null;
  }
  if (typeof body.originalName === "string") {
    patch.originalName = body.originalName.trim().slice(0, 180) || null;
  }
  if (body.clearPassword) {
    patch.passwordHash = null;
  } else if (typeof body.password === "string") {
    const password = body.password.trim();
    if (password.length < 4 || password.length > 64) {
      return Response.json({ error: "Şifre 4-64 karakter olmalı." }, { status: 400 });
    }
    patch.passwordHash = hashSharePassword(password);
  }
  if (typeof body.ttl === "string") {
    patch.expiresAt = resolveExpiry(true, body.ttl, post.type);
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Değişiklik yok." }, { status: 400 });
  }

  if (typeof body.hidden === "boolean" && Object.keys(patch).length === 1) {
    await setPostHidden(kod, body.hidden);
    return Response.json({ ok: true, hidden: body.hidden });
  }

  const db = await getDb();
  await db.update(posts).set(patch).where(eq(posts.id, kod));
  return Response.json({
    ok: true,
    hidden: patch.hiddenAt !== undefined ? Boolean(patch.hiddenAt) : undefined,
    originalName: patch.originalName,
    password: patch.passwordHash !== undefined ? Boolean(patch.passwordHash) : undefined,
    expiresAt: patch.expiresAt === undefined ? undefined : patch.expiresAt?.toISOString() ?? null,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token ?? request.headers.get("x-delete-token") ?? undefined;

  const post = await getPost(kod);
  if (!post) {
    return Response.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }

  const owner = Boolean(user && post.userId === user.id);
  if (!owner && !isDeleteTokenValid(kod, token)) {
    return Response.json({ error: "Bu dosyayı silemezsin." }, { status: 403 });
  }

  if (!post.deletedAt) {
    await softDeletePost(kod);
  }
  return Response.json({ ok: true });
}

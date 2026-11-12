import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { findExistingUpload } from "@/lib/existing-upload";
import { getLivePost, getPost, notRemoved } from "@/lib/posts";
import { resolveExpiry } from "@/lib/quota";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { createShortCode } from "@/lib/short-code";
import { hasUnlocked, makeDeleteToken } from "@/lib/unlock";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ kod: string }> },
) {
  const { kod } = await params;
  if (!/^[a-z0-9]{8}$/.test(kod)) {
    return Response.json({ error: "Kod geçersiz." }, { status: 400 });
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "auth", message: "Galerine eklemek için üye ol." }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email);
  if (!isAdmin && !rateLimit(`save:${user.id}`, 40, 10 * 60 * 1000)) {
    return Response.json({ error: "Çok fazla deneme. Biraz bekleyip tekrar dene." }, { status: 429 });
  }

  const live = await getLivePost(kod);
  const source = live ?? (isAdmin ? await getPost(kod) : null);
  if (!source || (source.deletedAt && !isAdmin)) {
    return Response.json({ error: "Paylaşım bulunamadı." }, { status: 404 });
  }
  if (source.passwordHash && !isAdmin && source.userId !== user.id && !(await hasUnlocked(kod))) {
    return Response.json({ error: "Bu içerik şifreli." }, { status: 403 });
  }

  if (source.userId === user.id && !source.deletedAt && !source.hiddenAt) {
    return Response.json({ kod: source.id, already: true, url: `/${source.id}` });
  }

  const db = await getDb();
  const [sameFile] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.userId, user.id), eq(posts.r2Key, source.r2Key), notRemoved))
    .limit(1);
  if (sameFile) {
    return Response.json({ kod: sameFile.id, already: true, url: `/${sameFile.id}` });
  }

  const existing = await findExistingUpload({
    userId: user.id,
    name: source.originalName ?? source.id,
    size: source.size,
    kind: source.type,
  });
  if (existing) {
    return Response.json({ kod: existing.id, already: true, url: `/${existing.id}` });
  }

  const nextKod = await createShortCode();
  const ttl = source.type === "image" ? "forever" : "1d";
  await db.insert(posts).values({
    id: nextKod,
    userId: user.id,
    guestKey: null,
    type: source.type,
    r2Key: source.r2Key,
    mime: source.mime,
    size: source.size,
    originalName: source.originalName,
    passwordHash: null,
    tags: source.tags,
    expiresAt: resolveExpiry(true, ttl, source.type),
    createdAt: new Date(),
  });

  return Response.json({
    kod: nextKod,
    already: false,
    url: `/${nextKod}`,
    deleteToken: makeDeleteToken(nextKod),
  });
}

import { createHash } from "node:crypto";
import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { posts, type Post } from "@/db/schema";
import { deleteFromR2, isR2Configured } from "@/lib/r2";

export function guestKeyFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.BETTER_AUTH_SECRET ?? "kisapaylas";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function expiryMs(value: Date | number | null) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.getTime() : Number(value);
}

export function isExpired(post: Post) {
  const exp = expiryMs(post.expiresAt);
  return Boolean(exp && exp < Date.now());
}

export function isPubliclyVisible(post: Post) {
  return !post.deletedAt && !post.hiddenAt && !isExpired(post);
}

export const notRemoved = and(
  isNull(posts.deletedAt),
  or(isNull(posts.expiresAt), gt(posts.expiresAt, new Date())),
);

export const publiclyVisible = and(notRemoved, isNull(posts.hiddenAt));

export async function usedStorage(params: { userId?: string; guestKey?: string }) {
  const owner = params.userId
    ? eq(posts.userId, params.userId)
    : eq(posts.guestKey, params.guestKey ?? "");

  const prefix = params.userId
    ? `uploads/${params.userId}/%`
    : `uploads/guest/${params.guestKey ?? ""}/%`;
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${posts.size}), 0)` })
    .from(posts)
    .where(and(owner, publiclyVisible, sql`${posts.r2Key} like ${prefix}`));

  return Number(row?.total ?? 0);
}

export async function incrementViews(kod: string) {
  const db = await getDb();
  await db
    .update(posts)
    .set({ views: sql`${posts.views} + 1` })
    .where(eq(posts.id, kod));
}

export async function getPost(kod: string) {
  const db = await getDb();
  const [post] = await db.select().from(posts).where(eq(posts.id, kod)).limit(1);
  return post ?? null;
}

export async function softDeletePost(kod: string) {
  const db = await getDb();
  await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(and(eq(posts.id, kod), isNull(posts.deletedAt)));
}

export async function setPostHidden(kod: string, hidden: boolean) {
  const db = await getDb();
  await db
    .update(posts)
    .set({ hiddenAt: hidden ? new Date() : null })
    .where(and(eq(posts.id, kod), isNull(posts.deletedAt)));
}

export async function restorePost(kod: string) {
  const db = await getDb();
  await db
    .update(posts)
    .set({ deletedAt: null, expiresAt: null })
    .where(eq(posts.id, kod));
}

export async function purgePost(kod: string) {
  const post = await getPost(kod);
  if (!post) {
    return false;
  }
  const db = await getDb();
  const [shared] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.r2Key, post.r2Key), ne(posts.id, kod)))
    .limit(1);
  if (!shared && isR2Configured()) {
    await deleteFromR2(post.r2Key).catch(() => undefined);
  }
  await db.delete(posts).where(eq(posts.id, kod));
  return true;
}

export async function getLivePost(kod: string) {
  const post = await getPost(kod);
  if (!post) {
    return null;
  }
  if (post.deletedAt || post.hiddenAt) {
    return null;
  }
  if (isExpired(post)) {
    await softDeletePost(kod);
    return null;
  }
  return post;
}

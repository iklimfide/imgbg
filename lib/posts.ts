import { createHash } from "node:crypto";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
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
  return !post.deletedAt && !isExpired(post);
}

export const publiclyVisible = and(
  isNull(posts.deletedAt),
  or(isNull(posts.expiresAt), gt(posts.expiresAt, new Date())),
);

export async function usedStorage(params: { userId?: string; guestKey?: string }) {
  const owner = params.userId
    ? eq(posts.userId, params.userId)
    : eq(posts.guestKey, params.guestKey ?? "");

  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${posts.size}), 0)` })
    .from(posts)
    .where(and(owner, publiclyVisible));

  return Number(row?.total ?? 0);
}

export async function getPost(kod: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, kod)).limit(1);
  return post ?? null;
}

export async function softDeletePost(kod: string) {
  await db
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(and(eq(posts.id, kod), isNull(posts.deletedAt)));
}

export async function restorePost(kod: string) {
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
  if (isR2Configured()) {
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
  if (post.deletedAt) {
    return null;
  }
  if (isExpired(post)) {
    await softDeletePost(kod);
    return null;
  }
  return post;
}

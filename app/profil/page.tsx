import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileUploads, type ProfilePostCard } from "@/components/ProfileUploads";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { notRemoved, usedStorage } from "@/lib/posts";
import { formatMb, MEMBER_STORAGE_MAX_BYTES } from "@/lib/quota";
import { getSession } from "@/lib/session";
import { publicMediaUrl } from "@/lib/r2";
import { getSiteUrl, shareUrl } from "@/lib/site";
import { parseTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

function iso(value: Date | number | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export default async function GaleriPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/giris");
  }

  const db = await getDb();
  const items = await db
    .select()
    .from(posts)
    .where(and(eq(posts.userId, session.user.id), notRemoved))
    .orderBy(desc(posts.createdAt));

  const origin = getSiteUrl();
  const used = await usedStorage({ userId: session.user.id });
  const cards: ProfilePostCard[] = items.map((post) => ({
    id: post.id,
    type: post.type,
    r2Key: post.r2Key,
    mime: post.mime,
    size: post.size,
    originalName: post.originalName,
    passwordHash: post.passwordHash,
    hiddenAt: post.hiddenAt ? iso(post.hiddenAt) : null,
    expiresAt: post.expiresAt ? iso(post.expiresAt) : null,
    views: post.views ?? 0,
    createdAt: iso(post.createdAt),
    pageUrl: shareUrl(post.id, origin),
    src: publicMediaUrl(post.id, post.r2Key, Boolean(post.passwordHash)),
    tags: parseTags(post.tags),
  }));

  return (
    <ProfileUploads
      posts={cards}
      ownerName={session.user.name}
      quota={`${formatMb(used)} / ${formatMb(MEMBER_STORAGE_MAX_BYTES)}`}
    />
  );
}

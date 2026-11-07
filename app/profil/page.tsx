import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileUploads, type ProfilePostCard } from "@/components/ProfileUploads";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { notRemoved, usedStorage } from "@/lib/posts";
import { formatMb, MEMBER_STORAGE_MAX_BYTES } from "@/lib/quota";
import { getSession } from "@/lib/session";
import { getSiteUrl, shareUrl } from "@/lib/site";

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
    views: post.views ?? 0,
    createdAt: iso(post.createdAt),
    pageUrl: shareUrl(post.id, origin),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Galerim</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@{session.user.name}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Kalıcı alan: {formatMb(used)} / {formatMb(MEMBER_STORAGE_MAX_BYTES)} MB
        </p>
      </div>
      <ProfileUploads posts={cards} />
    </div>
  );
}

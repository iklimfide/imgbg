import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminGallery, type AdminPostCard } from "@/components/AdminGallery";
import { AdminNav } from "@/components/AdminNav";
import { getDb } from "@/db";
import { posts, user } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { publicMediaUrl, publicThumbUrl } from "@/lib/r2";
import { getSiteUrl, shareUrl } from "@/lib/site";
import { parseTags, uniqueTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

function iso(value: Date | number | string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function AdminPage() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const origin = getSiteUrl();
  const db = await getDb();
  const items = await db
    .select({
      post: posts,
      ownerName: user.name,
    })
    .from(posts)
    .leftJoin(user, eq(posts.userId, user.id))
    .orderBy(desc(posts.createdAt))
    .limit(400);

  function holderLabel(name: string | null, userId: string | null) {
    const trimmed = name?.trim();
    if (trimmed) {
      return trimmed;
    }
    return userId ? "Üye" : "Misafir";
  }

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const list = groups.get(item.post.r2Key) ?? [];
    list.push(item);
    groups.set(item.post.r2Key, list);
  }

  const cards: AdminPostCard[] = [];
  for (const group of groups.values()) {
    const live = group.filter((item) => !item.post.deletedAt);
    const source = (live[0] ?? group[0]).post;
    const holders: { id: string; name: string }[] = [];
    for (const item of live) {
      const id = item.post.userId ?? "guest";
      const name = holderLabel(item.ownerName, item.post.userId);
      if (!holders.some((holder) => holder.id === id)) {
        holders.push({ id, name });
      }
    }
    const tagSource = live.length ? live : group;
    const tags = uniqueTags(tagSource.map((item) => ({ tags: parseTags(item.post.tags) })));
    const views = tagSource.reduce((sum, item) => sum + (item.post.views ?? 0), 0);
    const allHidden = live.length > 0 && live.every((item) => item.post.hiddenAt);
    cards.push({
      id: source.id,
      userId: source.userId,
      holders,
      type: source.type,
      r2Key: source.r2Key,
      mime: source.mime,
      size: source.size,
      originalName: source.originalName,
      ownerName: holders.length ? holders.map((holder) => holder.name).join(", ") : "—",
      passwordHash: source.passwordHash,
      deletedAt: live.length ? null : iso(source.deletedAt),
      hiddenAt: allHidden ? iso(source.hiddenAt) : null,
      expiresAt: iso(source.expiresAt),
      views,
      createdAt: iso(source.createdAt) ?? new Date().toISOString(),
      pageUrl: shareUrl(source.id, origin),
      src: publicMediaUrl(source.id, source.r2Key, Boolean(source.passwordHash)),
      thumbSrc:
        source.type === "image" || source.type === "video"
          ? publicThumbUrl(source.id, source.r2Key, Boolean(source.passwordHash))
          : publicMediaUrl(source.id, source.r2Key, Boolean(source.passwordHash)),
      tags,
    });
  }

  return (
    <div>
      <AdminNav current="uploads" />
      <AdminGallery posts={cards} />
    </div>
  );
}

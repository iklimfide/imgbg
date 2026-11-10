import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminGallery, type AdminPostCard } from "@/components/AdminGallery";
import { getDb } from "@/db";
import { posts, user } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { publicMediaUrl } from "@/lib/r2";
import { getSiteUrl, shareUrl } from "@/lib/site";

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

  const holdersByFile = new Map<string, { id: string; name: string }[]>();
  const originalByFile = new Map<string, (typeof items)[number]>();
  for (const item of [...items].reverse()) {
    const file = item.post.r2Key;
    const id = item.post.userId ?? "guest";
    const name = holderLabel(item.ownerName, item.post.userId);
    const holders = holdersByFile.get(file) ?? [];
    if (!holders.some((holder) => holder.id === id)) {
      holders.push({ id, name });
    }
    holdersByFile.set(file, holders);
    originalByFile.set(file, item);
  }

  const seen = new Set<string>();
  const cards: AdminPostCard[] = [];
  for (const item of items) {
    if (seen.has(item.post.r2Key)) {
      continue;
    }
    seen.add(item.post.r2Key);
    const { post, ownerName } = originalByFile.get(item.post.r2Key) ?? item;
    const holders = holdersByFile.get(post.r2Key) ?? [
      { id: post.userId ?? "guest", name: holderLabel(ownerName, post.userId) },
    ];
    cards.push({
      id: post.id,
      userId: post.userId,
      holders,
      type: post.type,
      r2Key: post.r2Key,
      mime: post.mime,
      size: post.size,
      originalName: post.originalName,
      ownerName: holders.map((holder) => holder.name).join(", "),
      passwordHash: post.passwordHash,
      deletedAt: iso(post.deletedAt),
      hiddenAt: iso(post.hiddenAt),
      expiresAt: iso(post.expiresAt),
      createdAt: iso(post.createdAt) ?? new Date().toISOString(),
      pageUrl: shareUrl(post.id, origin),
      src: publicMediaUrl(post.id, post.r2Key, Boolean(post.passwordHash)),
    });
  }

  return <AdminGallery posts={cards} />;
}

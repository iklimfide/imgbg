import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { posts } from "@/db/schema";
import { notRemoved } from "@/lib/posts";

export function fileBaseName(name: string) {
  try {
    return decodeURIComponent(name).replace(/\\/g, "/").split("/").pop()?.trim() ?? name.trim();
  } catch {
    return name.trim();
  }
}

export async function findExistingUpload(params: {
  userId?: string | null;
  guestKey?: string | null;
  name: string;
  size?: number;
  kind: string;
}) {
  const name = fileBaseName(params.name);
  if (!name) {
    return null;
  }
  const owner = params.userId
    ? eq(posts.userId, params.userId)
    : eq(posts.guestKey, params.guestKey ?? "");
  const db = await getDb();
  const filters = [
    owner,
    notRemoved,
    eq(posts.type, params.kind as "image" | "video" | "audio"),
    sql`lower(${posts.originalName}) = ${name.toLowerCase()}`,
  ];
  if (params.size && params.size > 0) {
    filters.push(eq(posts.size, params.size));
  }
  const [row] = await db.select().from(posts).where(and(...filters)).limit(1);
  return row ?? null;
}

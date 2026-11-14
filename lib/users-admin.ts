import { hashPassword } from "better-auth/crypto";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { account, albums, posts, session, user } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { purgePost } from "@/lib/posts";
import { deleteFromR2, isR2Configured } from "@/lib/r2";
import { INTERNAL_EMAIL_DOMAIN, isValidUsername, loginToEmail, normalizeUsername } from "@/lib/username";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  admin: boolean;
  postCount: number;
  bytes: number;
};

function iso(value: Date | number | string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const db = await getDb();
  const people = await db.select().from(user).orderBy(desc(user.createdAt));
  const stats = await db
    .select({
      userId: posts.userId,
      postCount: count(),
      bytes: sql<number>`coalesce(sum(${posts.size}), 0)`,
    })
    .from(posts)
    .groupBy(posts.userId);
  const byUser = new Map(stats.map((row) => [row.userId ?? "", row]));
  return people.map((row) => {
    const stat = byUser.get(row.id);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      createdAt: iso(row.createdAt),
      admin: isAdminEmail(row.email),
      postCount: Number(stat?.postCount ?? 0),
      bytes: Number(stat?.bytes ?? 0),
    };
  });
}

export async function updateAdminUser(
  id: string,
  body: { name?: string; email?: string; password?: string },
) {
  const db = await getDb();
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!row) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  let name = row.name;
  if (typeof body.name === "string" && body.name.trim()) {
    const next = normalizeUsername(body.name);
    if (!isValidUsername(next)) {
      throw new Error("Kullanıcı adı 2–24 karakter olmalı; harf, rakam, nokta, _ veya -.");
    }
    name = next;
  }

  let email = row.email;
  if (typeof body.email === "string" && body.email.trim()) {
    const next = loginToEmail(body.email);
    if (isAdminEmail(row.email) && next !== row.email.trim().toLowerCase()) {
      throw new Error("Master hesabın e-postası değiştirilemez.");
    }
    email = next;
  } else if (name !== row.name && row.email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) {
    email = loginToEmail(name);
  }

  if (name !== row.name || email !== row.email) {
    const clash = await db
      .select({ id: user.id })
      .from(user)
      .where(and(ne(user.id, id), eq(user.email, email)))
      .limit(1);
    if (clash[0]) {
      throw new Error("Bu e-posta veya kullanıcı adı zaten var.");
    }
    await db.update(user).set({ name, email, updatedAt: new Date() }).where(eq(user.id, id));
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password) {
    if (password.length < 8) {
      throw new Error("Şifre en az 8 karakter olmalı.");
    }
    const hashed = await hashPassword(password);
    await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(and(eq(account.userId, id), eq(account.providerId, "credential")));
  }

  return { id, name, email };
}

export async function deleteAdminUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new Error("Kendi hesabını silemezsin.");
  }
  const db = await getDb();
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!row) {
    throw new Error("Kullanıcı bulunamadı.");
  }
  if (isAdminEmail(row.email)) {
    const people = await db.select({ email: user.email }).from(user);
    const admins = people.filter((item) => isAdminEmail(item.email));
    if (admins.length <= 1) {
      throw new Error("Son master hesap silinemez.");
    }
  }

  const owned = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, id));
  for (const item of owned) {
    await purgePost(item.id);
  }
  if (isR2Configured()) {
    await deleteFromR2(`avatars/${id}.webp`).catch(() => undefined);
  }
  await db.delete(albums).where(eq(albums.userId, id));
  await db.delete(session).where(eq(session.userId, id));
  await db.delete(account).where(eq(account.userId, id));
  await db.delete(user).where(eq(user.id, id));
}

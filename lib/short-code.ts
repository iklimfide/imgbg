import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { getDb } from "@/db";
import { posts } from "@/db/schema";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export async function createShortCode() {
  for (let i = 0; i < 8; i += 1) {
    const kod = nanoid();
    const db = await getDb();
    const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, kod)).limit(1);
    if (existing.length === 0) {
      return kod;
    }
  }
  throw new Error("Kısa kod üretilemedi");
}

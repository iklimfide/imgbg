import { drizzle as drizzleD1, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type AppDb = DrizzleD1Database<typeof schema>;

export async function getDb(): Promise<AppDb> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  if (!env?.DB) {
    throw new Error("D1 bağlanmadı. wrangler.jsonc içindeki DB kaydını kontrol et.");
  }
  return drizzleD1(env.DB as Parameters<typeof drizzleD1>[0], { schema });
}

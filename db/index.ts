import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type AppDb = SqliteRemoteDatabase<typeof schema>;

let cached: AppDb | null = null;

export async function getDb(): Promise<AppDb> {
  if (cached) {
    return cached;
  }

  if (process.env.CLOUDFLARE_D1_DATABASE_ID && process.env.CLOUDFLARE_API_TOKEN) {
    const { createD1Db } = await import("./d1-http");
    cached = createD1Db();
    return cached;
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    const { drizzle } = await import("drizzle-orm/sqlite-proxy");
    cached = drizzle(async () => ({ rows: [] }), { schema });
    return cached;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Vercel'de D1 bağla: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN",
    );
  }

  const fs = await import("node:fs");
  const path = await import("node:path");
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "sqlite.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  cached = drizzle(sqlite, { schema }) as unknown as AppDb;
  return cached;
}

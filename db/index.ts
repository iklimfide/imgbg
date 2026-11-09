import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export type AppDb = SqliteRemoteDatabase<typeof schema>;

let cached: AppDb | null = null;

export async function getDb(): Promise<AppDb> {
  if (cached) {
    return cached;
  }

  if (process.env.CLOUDFLARE_D1_DATABASE_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const { createD1Db, ensureD1Schema } = await import("./d1-http");
      cached = createD1Db();
      void ensureD1Schema().catch(() => undefined);
      return cached;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "D1 bağlanamadı";
      if (process.env.VERCEL || process.env.NEXT_PHASE === "phase-production-build") {
        throw new Error(message);
      }
      console.warn(`[db] D1 kullanılamadı (${message}), yerel SQLite'a düşülüyor.`);
    }
  }

  if (process.env.NEXT_PHASE === "phase-production-build") {
    const { drizzle } = await import("drizzle-orm/sqlite-proxy");
    cached = drizzle(async () => ({ rows: [] }), { schema, logger: false });
    return cached;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Vercel'de D1 bağla: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN",
    );
  }

  cached = await openLocalSqlite();
  return cached;
}

async function openLocalSqlite(): Promise<AppDb> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const dbPath = path.join(process.cwd(), "data", "sqlite.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const init = fs.readFileSync(path.join(process.cwd(), "drizzle", "0001_init.sql"), "utf8");
  sqlite.exec(init);
  return drizzle(sqlite, { schema, logger: false }) as unknown as AppDb;
}

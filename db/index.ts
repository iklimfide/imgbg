import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type AppDb = LibSQLDatabase<typeof schema>;

let cached: AppDb | null = null;

export async function getDb(): Promise<AppDb> {
  if (cached) {
    return cached;
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    const client = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    cached = drizzleLibsql(client, { schema });
    return cached;
  }

  if (process.env.VERCEL) {
    throw new Error("Vercel'de TURSO_DATABASE_URL gerekli. SQLite dosyası orada kalıcı değil.");
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

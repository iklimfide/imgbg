import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

type RawResponse = {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: {
    results?: { columns?: string[]; rows?: unknown[][] } | unknown[];
    meta?: unknown;
  }[];
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function d1Error(status: number, json: RawResponse) {
  const item = json.errors?.[0];
  const detail = item?.message ?? "D1 sorgusu başarısız";
  const code = item?.code ? ` ${item.code}` : "";
  return new Error(`D1_${status}${code}: ${detail}`);
}

export async function execD1(sql: string, params: unknown[] = []) {
  return d1Raw(sql, params);
}

async function d1Raw(sql: string, params: unknown[]) {
  const account = env("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = env("CLOUDFLARE_D1_DATABASE_ID");
  const token = env("CLOUDFLARE_API_TOKEN");
  if (!account || !databaseId || !token) {
    throw new Error("D1 env eksik: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN");
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${databaseId}/raw`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );
  const json = (await response.json()) as RawResponse;
  if (!response.ok || !json.success) {
    throw d1Error(response.status, json);
  }
  const results = json.result?.[0]?.results;
  if (results && typeof results === "object" && "rows" in results && Array.isArray(results.rows)) {
    return results.rows;
  }
  return [];
}

export async function pingD1() {
  await d1Raw("SELECT 1", []);
}

const ALBUM_SQL = [
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS albums_userId_idx ON albums(user_id)`,
  `CREATE TABLE IF NOT EXISTS album_items (
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (album_id, post_id)
  )`,
  `CREATE INDEX IF NOT EXISTS album_items_postId_idx ON album_items(post_id)`,
];

export async function ensureD1Schema() {
  const existing = await d1Raw(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session'",
    [],
  );
  if (existing.length === 0) {
    const sql = readFileSync(join(process.cwd(), "drizzle", "0001_init.sql"), "utf8");
    const statements = sql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await d1Raw(statement, []);
    }
    return;
  }
  for (const statement of ALBUM_SQL) {
    await d1Raw(statement, []);
  }
  try {
    await d1Raw("ALTER TABLE posts ADD COLUMN tags TEXT", []);
  } catch {
    /* sütun zaten varsa D1 hata verir */
  }
}

export function createD1Db(): SqliteRemoteDatabase<typeof schema> {
  const db = drizzle(
    async (sql, params, method) => {
      const rows = await d1Raw(sql, params);
      if (method === "get") {
        return { rows: rows[0] as unknown as unknown[] };
      }
      return { rows };
    },
    { schema, logger: false },
  );
  const run = async <T>(callback: (tx: typeof db) => Promise<T>) => callback(db);
  db.transaction = run as unknown as typeof db.transaction;
  return db;
}

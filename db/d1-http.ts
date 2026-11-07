import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

type RawResponse = {
  success?: boolean;
  errors?: { message?: string }[];
  result?: { results?: { rows?: unknown[][] } }[];
};

async function d1Raw(sql: string, params: unknown[]) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
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
    throw new Error(json.errors?.[0]?.message ?? "D1 sorgusu başarısız");
  }
  return json.result?.[0]?.results?.rows ?? [];
}

export function createD1Db(): SqliteRemoteDatabase<typeof schema> {
  return drizzle(
    async (sql, params, method) => {
      const rows = await d1Raw(sql, params);
      if (method === "get") {
        return { rows: rows[0] as unknown as unknown[] };
      }
      return { rows };
    },
    { schema },
  );
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    appName: "imgBG.net",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {},
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let cached: AuthInstance | undefined;

export async function getAuth(): Promise<AuthInstance> {
  if (!cached) {
    cached = createAuth(await getDb());
  }
  return cached;
}

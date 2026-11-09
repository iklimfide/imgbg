import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

function originOf(value?: string) {
  if (!value) {
    return "";
  }
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).origin;
  } catch {
    return "";
  }
}

function authBaseUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (process.env.VERCEL && publicUrl && !publicUrl.includes("localhost")) {
    return publicUrl.replace(/\/$/, "");
  }
  if (process.env.VERCEL) {
    return "https://imgbg.net";
  }
  return (process.env.BETTER_AUTH_URL ?? publicUrl || "http://localhost:3000").replace(/\/$/, "");
}

function trustedOrigins() {
  const origins = new Set([
    "http://localhost:3000",
    "https://imgbg.net",
    "https://www.imgbg.net",
  ]);
  for (const value of [authBaseUrl(), process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_URL]) {
    const origin = originOf(value);
    if (origin) {
      origins.add(origin);
    }
  }
  return [...origins];
}

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    appName: "imgBG.net",
    baseURL: authBaseUrl(),
    trustedOrigins: trustedOrigins(),
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

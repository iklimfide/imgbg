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

function isAllowedHost(hostname: string) {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "imgbg.net" ||
    host.endsWith(".imgbg.net") ||
    host.endsWith(".vercel.app")
  );
}

function authBaseUrl() {
  if (process.env.VERCEL) {
    const publicUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    if (publicUrl && !publicUrl.includes("localhost")) {
      return publicUrl.replace(/\/$/, "");
    }
    return "https://imgbg.net";
  }
  return ((process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function staticTrustedOrigins() {
  const origins = new Set([
    "http://localhost:3000",
    "https://imgbg.net",
    "https://www.imgbg.net",
    "*.imgbg.net",
    "*.vercel.app",
  ]);
  for (const value of [authBaseUrl(), process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_URL]) {
    const origin = originOf(value);
    if (origin) {
      origins.add(origin);
    }
  }
  return [...origins];
}

function originsFromRequest(request?: Request) {
  if (!request) {
    return [];
  }
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const candidates = [
    request.headers.get("origin"),
    request.headers.get("x-forwarded-host")
      ? `${proto}://${request.headers.get("x-forwarded-host")!.split(",")[0]!.trim()}`
      : "",
    request.headers.get("host") ? `${proto}://${request.headers.get("host")!.split(",")[0]!.trim()}` : "",
  ];
  const extra: string[] = [];
  for (const value of candidates) {
    const origin = originOf(value ?? undefined);
    if (!origin) {
      continue;
    }
    try {
      if (isAllowedHost(new URL(origin).hostname)) {
        extra.push(origin);
      }
    } catch {
      /* ignore */
    }
  }
  return extra;
}

function createAuth(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    appName: "imgBG.net",
    baseURL: authBaseUrl(),
    trustedOrigins: async (request) => [...staticTrustedOrigins(), ...originsFromRequest(request)],
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

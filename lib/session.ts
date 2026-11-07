import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }
  return session.user;
}

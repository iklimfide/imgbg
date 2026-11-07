import { getSession } from "@/lib/session";

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }
  const allowed = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return null;
  }
  return session!.user;
}

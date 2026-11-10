import { getSession } from "@/lib/session";
import { loginToEmail } from "@/lib/username";

const BUILTIN_ADMINS = ["arifguvenc2005@gmail.com", "perlamare"];

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }
  const allowed = [
    ...BUILTIN_ADMINS,
    ...(process.env.ADMIN_EMAIL ?? "").split(","),
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const value = email.trim().toLowerCase();
  return allowed.some((item) => item === value || loginToEmail(item) === value);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return null;
  }
  return session!.user;
}

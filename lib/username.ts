export const INTERNAL_EMAIL_DOMAIN = "signin.woxifly.internal";

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,23}$/i.test(value.trim());
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function loginToEmail(value: string) {
  const next = value.trim();
  if (next.includes("@")) {
    return next.toLowerCase();
  }
  return usernameToEmail(next);
}

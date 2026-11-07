import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashSharePassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySharePassword(plain: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const check = scryptSync(plain, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (check.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(check, expected);
}

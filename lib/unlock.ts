import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

function secret() {
  return process.env.BETTER_AUTH_SECRET ?? "kisapaylas";
}

export function cookieName(kod: string) {
  return `unlock_${kod}`;
}

export function makeUnlockToken(kod: string) {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const sig = createHmac("sha256", secret()).update(`${kod}:${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function isUnlockTokenValid(kod: string, token: string | undefined) {
  if (!token) {
    return false;
  }
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || Date.now() > exp) {
    return false;
  }
  const expected = createHmac("sha256", secret()).update(`${kod}:${exp}`).digest("hex");
  return sig === expected;
}

export async function hasUnlocked(kod: string) {
  const store = await cookies();
  return isUnlockTokenValid(kod, store.get(cookieName(kod))?.value);
}

export function makeDeleteToken(kod: string) {
  return createHmac("sha256", secret()).update(`delete:${kod}`).digest("hex");
}

export function isDeleteTokenValid(kod: string, token: string | undefined) {
  if (!token) {
    return false;
  }
  return token === makeDeleteToken(kod);
}

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "sz_admin_session";
const maxAgeSeconds = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  return value;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createAdminSessionValue() {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = `admin.${issuedAt}`;
  return `${payload}.${signature(payload)}`;
}

export function isValidAdminSession(value?: string) {
  if (!value) return false;
  const [role, issuedAt, suppliedSignature] = value.split(".");
  if (role !== "admin" || !issuedAt || !suppliedSignature) return false;
  const issuedAtNumber = Number(issuedAt);
  const now = Date.now() / 1000;
  if (!Number.isFinite(issuedAtNumber) || issuedAtNumber > now + 60 || now - issuedAtNumber > maxAgeSeconds) return false;
  const expected = signature(`${role}.${issuedAt}`);
  if (expected.length !== suppliedSignature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(suppliedSignature));
}

export async function hasAdminSession() {
  const store = await cookies();
  try {
    return isValidAdminSession(store.get(cookieName)?.value);
  } catch {
    return false;
  }
}

export const adminCookie = {
  name: cookieName,
  maxAge: maxAgeSeconds,
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

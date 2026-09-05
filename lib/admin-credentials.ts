import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const keyLength = 64;

export type AdminAccount = {
  account_id: string;
  username: string;
  email: string;
  password_hash: string;
  password_salt: string;
  is_active: boolean;
  session_version: number;
};

export function normalizeAdminLogin(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

export function passwordPolicyMessage(password: unknown) {
  if (typeof password !== "string" || password.length < 16 || password.length > 128) return "密码须为 16–128 个字符。";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "密码须同时包含大写字母、小写字母、数字和符号。";
  }
  return null;
}

export function hashAdminPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const hash = scryptSync(password, salt, keyLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("base64url");
  return { hash, salt };
}

export function verifyAdminPassword(password: string, expectedHash: string, salt: string) {
  try {
    const actual = Buffer.from(hashAdminPassword(password, salt).hash, "base64url");
    const expected = Buffer.from(expectedHash, "base64url");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

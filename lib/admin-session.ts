import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { rpc } from "@/lib/supabase-server";

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

type AdminSession = { accountId: string; username: string; version: number; issuedAt: number };

export function createAdminSessionValue(accountId: string, username: string, version: number) {
  const payload = Buffer.from(JSON.stringify({ accountId, username, version, issuedAt: Math.floor(Date.now() / 1000) }), "utf8").toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function parseAdminSession(value?: string): AdminSession | null {
  if (!value) return null;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expected = signature(payload);
  if (expected.length !== suppliedSignature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(suppliedSignature))) return null;
  let parsed: Partial<AdminSession>;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession>;
  } catch {
    return null;
  }
  const issuedAtNumber = Number(parsed.issuedAt);
  const now = Date.now() / 1000;
  if (!Number.isFinite(issuedAtNumber) || issuedAtNumber > now + 60 || now - issuedAtNumber > maxAgeSeconds) return null;
  if (typeof parsed.accountId !== "string" || typeof parsed.username !== "string" || !Number.isInteger(parsed.version)) return null;
  return { accountId: parsed.accountId, username: parsed.username, version: Number(parsed.version), issuedAt: issuedAtNumber };
}

export async function getAdminSession() {
  const store = await cookies();
  try {
    const session = parseAdminSession(store.get(cookieName)?.value);
    if (!session) return null;
    const account = await rpc<{ is_active: boolean; session_version: number }[]>("admin_get_session_account", { p_account_id: session.accountId });
    if (!account[0]?.is_active || account[0].session_version !== session.version) return null;
    return session;
  } catch {
    return null;
  }
}

export async function hasAdminSession() { return Boolean(await getAdminSession()); }

export const adminCookie = {
  name: cookieName,
  maxAge: maxAgeSeconds,
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

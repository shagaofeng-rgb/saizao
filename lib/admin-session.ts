import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { rpc } from "@/lib/supabase-server";

const cookieName = "sz_admin_session";
const maxAgeSeconds = 60 * 60 * 8;
export type AdminRole = "super_admin" | "admin" | "sales" | "content_editor" | "viewer";
function secret() { const value = process.env.ADMIN_SESSION_SECRET; if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters."); return value; }
function signature(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
type StoredSession = { accountId: string; username: string; version: number; issuedAt: number };
export type AdminSession = StoredSession & { role: AdminRole; email: string; displayName: string; forcePasswordReset: boolean };

export function createAdminSessionValue(accountId: string, username: string, version: number) {
  const payload = Buffer.from(JSON.stringify({ accountId, username, version, issuedAt: Math.floor(Date.now() / 1000) }), "utf8").toString("base64url");
  return `${payload}.${signature(payload)}`;
}
function parse(value?: string): StoredSession | null {
  if (!value) return null;
  const [payload, supplied, extra] = value.split(".");
  if (!payload || !supplied || extra) return null;
  const expected = signature(payload);
  if (expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<StoredSession>;
    const now = Date.now() / 1000;
    if (typeof decoded.accountId !== "string" || typeof decoded.username !== "string" || !Number.isInteger(decoded.version) || !Number.isFinite(Number(decoded.issuedAt)) || Number(decoded.issuedAt) > now + 60 || now - Number(decoded.issuedAt) > maxAgeSeconds) return null;
    return decoded as StoredSession;
  } catch { return null; }
}
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const base = parse((await cookies()).get(cookieName)?.value);
    if (!base) return null;
    const account = (await rpc<{is_active:boolean;session_version:number;role:AdminRole;email:string;display_name:string;force_password_reset:boolean}[]>("admin_get_session_account",{p_account_id:base.accountId}))[0];
    if (!account?.is_active || account.session_version !== base.version) return null;
    return {...base, role:account.role, email:account.email, displayName:account.display_name, forcePasswordReset:account.force_password_reset};
  } catch { return null; }
}
export async function hasAdminSession() { return Boolean(await getAdminSession()); }
export function canManageStaff(role: AdminRole) { return role === "super_admin" || role === "admin"; }
export function canManageContent(role: AdminRole) { return role === "super_admin" || role === "admin" || role === "content_editor"; }
export const adminCookie = { name:cookieName,maxAge:maxAgeSeconds,httpOnly:true,sameSite:"strict" as const,secure:process.env.NODE_ENV==="production",path:"/" };

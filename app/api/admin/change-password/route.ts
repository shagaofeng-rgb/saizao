import { NextResponse } from "next/server";
import { adminCookie, createAdminSessionValue, getAdminSession } from "@/lib/admin-session";
import { AdminAccount, hashAdminPassword, passwordPolicyMessage, verifyAdminPassword } from "@/lib/admin-credentials";
import { fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rpc } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "登录已失效，请重新登录。" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ message: "请求校验失败。" }, { status: 403 });
  if (requestBodyTooLarge(request, 8_000)) return NextResponse.json({ message: "请求内容过大。" }, { status: 413 });
  const body = await request.json().catch(() => ({}));
  const policyError = passwordPolicyMessage(body.newPassword);
  if (policyError) return NextResponse.json({ message: policyError }, { status: 400 });
  if (body.currentPassword === body.newPassword) return NextResponse.json({ message: "新密码不能与当前密码相同。" }, { status: 400 });
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "admin_password_change", p_fingerprint: fingerprint(request, "admin_password_change"), p_limit: 5, p_window_seconds: 1800 });
    if (!limit.allowed) return NextResponse.json({ message: "尝试次数过多，请稍后再试。" }, { status: 429 });
    const account = (await rpc<AdminAccount[]>("admin_get_account", { p_login: session.username }))[0];
    if (!account?.is_active || typeof body.currentPassword !== "string" || !verifyAdminPassword(body.currentPassword, account.password_hash, account.password_salt)) {
      return NextResponse.json({ message: "当前密码不正确。" }, { status: 401 });
    }
    const { hash, salt } = hashAdminPassword(body.newPassword);
    const result = await rpc<{ updated: boolean; session_version?: number }>("admin_update_password", { p_account_id: session.accountId, p_password_hash: hash, p_password_salt: salt });
    if (!result.updated || !result.session_version) return NextResponse.json({ message: "密码更新失败。" }, { status: 503 });
    const response = NextResponse.json({ ok: true, message: "密码已更新。" });
    response.cookies.set({ ...adminCookie, value: createAdminSessionValue(session.accountId, session.username, result.session_version) });
    return response;
  } catch {
    return NextResponse.json({ message: "密码更新服务暂不可用。" }, { status: 503 });
  }
}

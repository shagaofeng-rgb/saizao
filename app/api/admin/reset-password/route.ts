import { NextResponse } from "next/server";
import { hashAdminPassword, hashPasswordResetToken, passwordPolicyMessage } from "@/lib/admin-credentials";
import { fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rpc } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "请求校验失败。" }, { status: 403 });
  if (requestBodyTooLarge(request, 8_000)) return NextResponse.json({ message: "请求内容过大。" }, { status: 413 });
  const body = await request.json().catch(() => ({}));
  const policyError = passwordPolicyMessage(body.password);
  if (policyError) return NextResponse.json({ message: policyError }, { status: 400 });
  if (typeof body.token !== "string" || body.token.length < 32 || body.token.length > 200) return NextResponse.json({ message: "重置链接无效或已过期。" }, { status: 400 });
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "admin_reset_submit", p_fingerprint: fingerprint(request, "admin_reset_submit"), p_limit: 6, p_window_seconds: 1800 });
    if (!limit.allowed) return NextResponse.json({ message: "尝试次数过多，请稍后再试。" }, { status: 429 });
    const { hash, salt } = hashAdminPassword(body.password);
    const result = await rpc<{ updated: boolean; username?: string; session_version?: number }>("admin_consume_password_reset", { p_token_hash: hashPasswordResetToken(body.token), p_password_hash: hash, p_password_salt: salt });
    if (!result.updated) return NextResponse.json({ message: "重置链接无效或已过期，请重新申请。" }, { status: 400 });
    return NextResponse.json({ ok: true, message: "密码已更新，请使用新密码登录。" });
  } catch {
    return NextResponse.json({ message: "密码更新服务暂不可用。" }, { status: 503 });
  }
}

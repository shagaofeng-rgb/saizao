import { NextResponse } from "next/server";
import { createPasswordResetToken, normalizeAdminLogin } from "@/lib/admin-credentials";
import { isAdminRecoveryEmailConfigured, sendAdminPasswordResetEmail } from "@/lib/admin-email";
import { fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

type ResetRecipient = { account_id: string; username: string; email: string };
const genericMessage = "如果账号与邮箱匹配，重置邮件将在几分钟内送达。";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAdminRecoveryEmailConfigured()) {
    return NextResponse.json({ message: "密码找回邮件服务尚未完成配置。" }, { status: 503 });
  }
  if (!isSameOrigin(request)) return NextResponse.json({ message: "请求校验失败。" }, { status: 403 });
  if (requestBodyTooLarge(request, 5_000)) return NextResponse.json({ message: "请求内容过大。" }, { status: 413 });
  const body = await request.json().catch(() => ({}));
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "admin_password_reset", p_fingerprint: fingerprint(request, "admin_password_reset"), p_limit: 3, p_window_seconds: 3600 });
    if (!limit.allowed) return NextResponse.json({ message: "请求次数过多，请稍后再试。" }, { status: 429 });
    const login = normalizeAdminLogin(body.login);
    const { token, tokenHash } = createPasswordResetToken();
    const recipient = await rpc<ResetRecipient | null>("admin_create_password_reset", {
      p_login: login,
      p_token_hash: tokenHash,
      p_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    if (recipient) {
      const baseUrl = (process.env.ADMIN_PUBLIC_URL || "https://www.szxj6899.com").replace(/\/$/, "");
      await sendAdminPasswordResetEmail({ to: recipient.email, username: recipient.username, resetUrl: `${baseUrl}/admin/reset-password#token=${encodeURIComponent(token)}` }).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, message: genericMessage });
  } catch {
    return NextResponse.json({ message: "暂时无法发送重置邮件，请稍后再试。" }, { status: 503 });
  }
}

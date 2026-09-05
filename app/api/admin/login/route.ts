import { NextResponse } from "next/server";
import { adminCookie, createAdminSessionValue } from "@/lib/admin-session";
import { AdminAccount, normalizeAdminLogin, verifyAdminPassword } from "@/lib/admin-credentials";
import { fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

const dummyPasswordHash = "A".repeat(86);
const dummyPasswordSalt = "admin-login-dummy-salt";

export async function POST(request: Request) {
  if (!process.env.ADMIN_SESSION_SECRET || !isSupabaseConfigured()) {
    return NextResponse.json({ message: "后台尚未完成安全配置。" }, { status: 503 });
  }

  if (!isSameOrigin(request)) return NextResponse.json({ message: "请求校验失败。" }, { status: 403 });
  if (requestBodyTooLarge(request, 5_000)) return NextResponse.json({ message: "请求内容过大。" }, { status: 413 });

  const body = await request.json().catch(() => ({}));
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "admin_login", p_fingerprint: fingerprint(request, "admin_login"), p_limit: 8, p_window_seconds: 900 });
    if (!limit.allowed) return NextResponse.json({ message: "登录尝试次数过多，请稍后再试。" }, { status: 429 });
  } catch {
    return NextResponse.json({ message: "安全校验服务暂不可用。" }, { status: 503 });
  }

  const login = normalizeAdminLogin(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  let account: AdminAccount | undefined;
  try {
    account = (await rpc<AdminAccount[]>("admin_get_account", { p_login: login }))[0];
  } catch {
    return NextResponse.json({ message: "账号服务暂不可用。" }, { status: 503 });
  }
  const passwordMatches = verifyAdminPassword(password, account?.password_hash ?? dummyPasswordHash, account?.password_salt ?? dummyPasswordSalt);
  if (!account?.is_active || !passwordMatches) {
    return NextResponse.json({ message: "账号或密码不正确。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...adminCookie, value: createAdminSessionValue(account.account_id, account.username, account.session_version) });
  return response;
}

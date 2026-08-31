import { NextResponse } from "next/server";
import { adminCookie, createAdminSessionValue } from "@/lib/admin-session";
import { fingerprint, isSameOrigin, requestBodyTooLarge, safeEqualText } from "@/lib/request-security";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_ACCESS_PASSWORD;
  if (!configuredPassword || configuredPassword.length < 14 || !process.env.ADMIN_SESSION_SECRET || !isSupabaseConfigured()) {
    return NextResponse.json({ message: "后台尚未完成安全配置，请先在 Vercel 设置管理员环境变量。" }, { status: 503 });
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

  if (typeof body.password !== "string" || !safeEqualText(body.password, configuredPassword)) {
    return NextResponse.json({ message: "密码不正确。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...adminCookie, value: createAdminSessionValue() });
  return response;
}

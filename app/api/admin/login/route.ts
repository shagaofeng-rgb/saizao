import { NextResponse } from "next/server";
import { adminCookie, createAdminSessionValue } from "@/lib/admin-session";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_ACCESS_PASSWORD;
  if (!configuredPassword || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ message: "后台尚未完成安全配置，请先在 Vercel 设置管理员环境变量。" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || body.password !== configuredPassword) {
    return NextResponse.json({ message: "密码不正确。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...adminCookie, value: createAdminSessionValue() });
  return response;
}

import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { checkEnquiryMail } from "@/lib/email-delivery";
import { fingerprint, isSameOrigin } from "@/lib/request-security";
import { rpc } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  if (!canManageStaff(session.role) || !isSameOrigin(request)) return NextResponse.json({ message: "无权检查邮件服务。" }, { status: 403 });
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", {
      p_scope: "admin_mail_check", p_fingerprint: fingerprint(request, "admin_mail_check"), p_limit: 6, p_window_seconds: 300,
    });
    if (!limit.allowed) return NextResponse.json({ message: "检查次数过多，请稍后再试。" }, { status: 429 });
    return NextResponse.json({ state: await checkEnquiryMail() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ message: "邮件服务暂时无法检查。" }, { status: 503 }); }
}

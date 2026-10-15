import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { notifyTeam } from "@/lib/lead-notifications";
import { isSameOrigin } from "@/lib/request-security";
import { recordLeadNotification, rpc } from "@/lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "只有管理员可以重发通知。" }, { status: 403 });
  if (!isSameOrigin(request)) return NextResponse.json({ message: "请求校验失败。" }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ message: "询盘编号无效。" }, { status: 400 });
  try {
    const lead = await rpc<Record<string, string | null> | null>("admin_claim_lead_notification_retry", { p_lead_id: id });
    if (!lead) return NextResponse.json({ message: "当前状态不可重发，或五分钟内已尝试过。" }, { status: 409 });
    let status: "sent" | "failed" | "not_configured" = "failed";
    try { status = await notifyTeam(lead); } finally { await recordLeadNotification(id, status); }
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "lead_notification_retried", p_entity_type: "leads", p_entity_id: id, p_metadata: { status } }).catch(() => undefined);
    return NextResponse.json({ status, message: status === "sent" ? "通知已发送。" : status === "not_configured" ? "通知服务尚未配置，询盘仍保存在后台。" : "发送失败，请检查通知服务配置。" });
  } catch { return NextResponse.json({ message: "重发未完成，请稍后检查通知状态。" }, { status: 503 }); }
}

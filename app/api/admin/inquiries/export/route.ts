import { NextResponse } from "next/server";
import { canExportLeads, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";

type Lead = { id: string; created_at: string; status: string; name: string; company: string; email: string; phone: string | null; country_name: string | null; country_code: string | null; application: string | null; brief: string; page_path: string | null; source: string | null; medium: string | null; campaign: string | null; assigned_to: string | null };
const columns: [keyof Lead, string][] = [["created_at", "提交时间 UTC"], ["status", "状态"], ["name", "联系人"], ["company", "公司"], ["email", "邮箱"], ["phone", "电话"], ["country_name", "国家/地区"], ["country_code", "国家代码"], ["application", "应用"], ["brief", "需求"], ["page_path", "来源页面"], ["source", "UTM Source"], ["medium", "UTM Medium"], ["campaign", "UTM Campaign"], ["assigned_to", "负责人 ID"]];
function csvCell(value: unknown) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function date(value: string | null, fallback: Date) { const parsed = value ? new Date(value) : fallback; return Number.isNaN(parsed.getTime()) ? null : parsed; }
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || !canExportLeads(session.role)) return NextResponse.json({ message: "无权导出客户资料。" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const now = new Date(), fallback = new Date(now.getTime() - 89 * 86400000);
  const from = date(params.get("from"), fallback), to = date(params.get("to"), now);
  if (!from || !to || from > to || to.getTime() > now.getTime() + 86400000 || to.getTime() - from.getTime() > 366 * 86400000) return NextResponse.json({ message: "导出时间范围无效或超过一年。" }, { status: 400 });
  const status = params.get("status") || "";
  if (status && !["New", "Processing", "Contacted", "Qualified", "Closed", "Invalid"].includes(status)) return NextResponse.json({ message: "处理状态无效。" }, { status: 400 });
  const query = (params.get("q") || "").trim().replace(/[,*()]/g, "").slice(0, 80);
  const filter = `&created_at=gte.${encodeURIComponent(from.toISOString())}&created_at=lte.${encodeURIComponent(to.toISOString())}${status ? `&status=eq.${status}` : ""}${query ? `&or=(name.ilike.*${encodeURIComponent(query)}*,company.ilike.*${encodeURIComponent(query)}*,email.ilike.*${encodeURIComponent(query)}*)` : ""}`;
  try {
    const base = `leads?select=${columns.map(([key]) => key).join(",")}&order=created_at.desc${filter}`;
    const count = await rest<Lead[]>(`${base}&limit=1`, { headers: { Prefer: "count=exact" } });
    const total = Number(count.response.headers.get("content-range")?.split("/")[1] || 0);
    if (total > 5000) return NextResponse.json({ message: "结果超过 5000 条，请缩小时间范围后再导出。" }, { status: 413 });
    const rows: Lead[] = [];
    for (let offset = 0; offset < total; offset += 500) {
      const page = await rest<Lead[]>(`${base}&limit=500&offset=${offset}`);
      rows.push(...page.data);
      if (page.data.length < 500) break;
    }
    const content = "\ufeff" + [columns.map(([, label]) => csvCell(label)).join(","), ...rows.map((item) => columns.map(([key]) => csvCell(item[key])).join(","))].join("\r\n");
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "leads_exported", p_entity_type: "leads", p_entity_id: null, p_metadata: { count: rows.length, from: from.toISOString(), to: to.toISOString() } }).catch(() => undefined);
    return new Response(content, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="saizhao-inquiries-${now.toISOString().slice(0, 10)}.csv"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch { return NextResponse.json({ message: "导出失败，请稍后重试。" }, { status: 503 }); }
}

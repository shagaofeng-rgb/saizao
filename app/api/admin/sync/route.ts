import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { validAdminDateRange } from "@/lib/admin-date-range";
import { getGoogleReporting } from "@/lib/google-reporting";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rest, rpc } from "@/lib/supabase-server";

type Run = { id: string; source: string; status: string; period_from: string; period_to: string; started_at: string; finished_at: string | null; result: Record<string, unknown>; error_code: string | null };
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "无权查看核验记录。" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Number(params.get("page")) || 1));
  const pageSize = [20, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 20;
  try {
    const { data, response } = await rest<Run[]>(`integration_sync_runs?select=id,source,status,period_from,period_to,started_at,finished_at,result,error_code&source=eq.google&order=started_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}`, { headers: { Prefer: "count=exact" } });
    return NextResponse.json({ data, total: Number(response.headers.get("content-range")?.split("/")[1] || 0), page, pageSize });
  } catch { return NextResponse.json({ message: "暂时无法读取核验记录。" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "只有管理员可以运行核验。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 2000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const period = { preset: "custom" as const, from: String(body.from || ""), to: String(body.to || "") };
  if (!validAdminDateRange(period)) return NextResponse.json({ message: "请选择有效的时间范围。" }, { status: 400 });
  const start = new Date(`${period.from}T00:00:00Z`), end = new Date(`${period.to}T00:00:00Z`);
  if ((end.getTime() - start.getTime()) / 86400000 > 365) return NextResponse.json({ message: "每次最多核验 366 天。" }, { status: 400 });
  const jobKey = randomUUID();
  try {
    const saved = await rest<Run[]>("integration_sync_runs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ source: "google", job_key: jobKey, status: "running", period_from: period.from, period_to: period.to, triggered_by: session.accountId }) });
    const id = saved.data[0]?.id;
    if (!id) throw new Error("run not saved");
    const report = await getGoogleReporting(period.from, period.to);
    const states = [report.searchConsole.state, report.analytics.state];
    const status = states.every((value) => value === "ready") ? "completed" : states.some((value) => value === "ready") ? "partial" : "failed";
    const result = { searchConsole: report.searchConsole.state === "ready" ? { state: "ready", siteUrl: report.searchConsole.data.siteUrl, ...report.searchConsole.data.totals } : { state: report.searchConsole.state }, analytics: report.analytics.state === "ready" ? { state: "ready", ...report.analytics.data } : { state: report.analytics.state } };
    await rest(`integration_sync_runs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, finished_at: new Date().toISOString(), result, error_code: status === "failed" ? states.join("+") : null }) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "google_report_checked", p_entity_type: "integration_sync_runs", p_entity_id: id, p_metadata: { status, from: period.from, to: period.to } }).catch(() => undefined);
    return NextResponse.json({ status, result });
  } catch { return NextResponse.json({ message: "核验任务未能完成，请稍后重试。" }, { status: 503 }); }
}

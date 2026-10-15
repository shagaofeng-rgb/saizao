import { NextResponse } from "next/server";
import { canManageLeads, canManageStaff, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

const statuses = new Set(["New", "Processing", "Contacted", "Qualified", "Closed", "Invalid"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ message: "询盘编号无效。" }, { status: 400 });
  const data = await rpc("admin_get_lead_detail", { p_lead_id: id }).catch(() => null);
  if (!data) return NextResponse.json({ message: "暂时无法读取询盘详情。" }, { status: 503 });
  const detail = data as { lead?: { email?: string } | null };
  let duplicates: { id: string; created_at: string }[] = [];
  if (detail.lead?.email) {
    const email = encodeURIComponent(detail.lead.email);
    duplicates = (await rest<{ id: string; created_at: string }[]>(`leads?select=id,created_at&email=eq.${email}&id=neq.${id}&order=created_at.desc&limit=5`).catch(() => ({ data: [] }))).data;
  }
  return NextResponse.json({ data: { ...detail, duplicates } });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); if (!session || !canManageLeads(session.role)) return NextResponse.json({ message: "无权修改询盘。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 }); const { id } = await params; const body = await request.json().catch(() => ({}));
  if (!uuid.test(id)) return NextResponse.json({ message: "询盘编号无效。" }, { status: 400 });
  const status = typeof body.status === "string" && statuses.has(body.status) ? body.status : null;
  const date = body.nextFollowUpAt ? new Date(String(body.nextFollowUpAt)) : null;
  if (date && Number.isNaN(date.getTime())) return NextResponse.json({ message: "跟进时间无效。" }, { status: 400 });
  const nextFollowUpAt = date?.toISOString() || null;
  if (body.assignedTo !== undefined && !canManageStaff(session.role)) return NextResponse.json({ message: "只有管理员可以分配负责人。" }, { status: 403 });
  let assignedTo: string | null = null;
  if (body.assignedTo) {
    assignedTo = String(body.assignedTo);
    if (!uuid.test(assignedTo)) return NextResponse.json({ message: "负责人无效。" }, { status: 400 });
    const staff = await rpc<{ id: string; is_active: boolean; role: string }[]>("admin_list_staff", {}).catch(() => []);
    if (!staff.some((item) => item.id === assignedTo && item.is_active && ["super_admin", "admin", "sales"].includes(item.role))) return NextResponse.json({ message: "请选择在职销售或管理员。" }, { status: 400 });
  }
  const tags: string[] | null | undefined = body.tags === undefined ? undefined : Array.isArray(body.tags) ? [...new Set<string>(body.tags.map((value: unknown) => String(value).trim()).filter(Boolean))].slice(0, 8) : null;
  if (tags === null || tags?.some((value) => value.length > 30)) return NextResponse.json({ message: "标签最多 8 个，每个不超过 30 字。" }, { status: 400 });
  if (!status && body.nextFollowUpAt === undefined && body.assignedTo === undefined && tags === undefined) return NextResponse.json({ message: "没有可更新的内容。" }, { status: 400 });
  const payload = { ...(status ? { status } : {}), ...(body.nextFollowUpAt !== undefined ? { next_follow_up_at: nextFollowUpAt } : {}), ...(body.assignedTo !== undefined ? { assigned_to: assignedTo } : {}), ...(tags !== undefined ? { tags } : {}) };
  const result = await rest<Record<string, unknown>[]>(`leads?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }).catch(() => null);
  if (!result?.data?.[0]) return NextResponse.json({ message: "更新失败。" }, { status: 400 });
  await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "lead_updated", p_entity_type: "leads", p_entity_id: id, p_metadata: { fields: Object.keys(payload) } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); if (!session || !canManageLeads(session.role)) return NextResponse.json({ message: "无权修改询盘。" }, { status: 403 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 }); const { id } = await params; const body = await request.json().catch(() => ({})); const note = typeof body.note === "string" ? body.note.trim().slice(0, 4000) : "";
  if (!note) return NextResponse.json({ message: "请填写跟进记录。" }, { status: 400 });
  const result = await rest<Record<string, unknown>[]>("lead_notes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ lead_id: id, note, stage: typeof body.stage === "string" ? body.stage.slice(0, 60) : null, created_by: session.accountId }) }).catch(() => null);
  if (!result?.data?.[0]) return NextResponse.json({ message: "保存跟进记录失败。" }, { status: 400 });
  await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "lead_note_added", p_entity_type: "leads", p_entity_id: id, p_metadata: {} }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

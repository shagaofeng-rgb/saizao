import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

const statuses = new Set(["New", "Processing", "Contacted", "Qualified", "Closed", "Invalid"]);
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); const { id } = await params;
  const data = await rpc("admin_get_lead_detail", { p_lead_id: id }).catch(() => null);
  return data ? NextResponse.json({ data }) : NextResponse.json({ message: "暂时无法读取询盘详情。" }, { status: 503 });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 }); const { id } = await params; const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" && statuses.has(body.status) ? body.status : null;
  const nextFollowUpAt = typeof body.nextFollowUpAt === "string" && body.nextFollowUpAt ? new Date(body.nextFollowUpAt).toISOString() : null;
  if (!status && body.nextFollowUpAt === undefined) return NextResponse.json({ message: "没有可更新的内容。" }, { status: 400 });
  const result = await rest<Record<string, unknown>[]>(`leads?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...(status ? { status } : {}), ...(body.nextFollowUpAt !== undefined ? { next_follow_up_at: nextFollowUpAt } : {}) }) }).catch(() => null);
  return result?.data?.[0] ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "更新失败。" }, { status: 400 });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 8000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 }); const { id } = await params; const body = await request.json().catch(() => ({})); const note = typeof body.note === "string" ? body.note.trim().slice(0, 4000) : "";
  if (!note) return NextResponse.json({ message: "请填写跟进记录。" }, { status: 400 });
  const result = await rest<Record<string, unknown>[]>("lead_notes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ lead_id: id, note, stage: typeof body.stage === "string" ? body.stage.slice(0, 60) : null, created_by: session.accountId }) }).catch(() => null);
  return result?.data?.[0] ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "保存跟进记录失败。" }, { status: 400 });
}

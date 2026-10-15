import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";

type Audit = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "无权查看操作记录。" }, { status: 403 });
  const query = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Number(query.get("page")) || 1));
  const pageSize = [20, 50, 100].includes(Number(query.get("pageSize"))) ? Number(query.get("pageSize")) : 20;
  const from = query.get("from"), to = query.get("to"), action = query.get("action");
  const validDate = (value: string | null) => value && Number.isFinite(Date.parse(value));
  const filters = [validDate(from) ? `created_at=gte.${encodeURIComponent(new Date(from!).toISOString())}` : "", validDate(to) ? `created_at=lte.${encodeURIComponent(new Date(to!).toISOString())}` : "", action && /^[a-z_]{1,80}$/.test(action) ? `action=eq.${action}` : ""].filter(Boolean).join("&");
  try {
    const [logs, staff] = await Promise.all([
      rest<Audit[]>(`admin_audit_logs?select=id,actor_id,action,entity_type,entity_id,created_at&order=created_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}${filters ? `&${filters}` : ""}`, { headers: { Prefer: "count=exact" } }),
      rpc<{ id: string; display_name: string }[]>("admin_list_staff", {}),
    ]);
    const names = Object.fromEntries(staff.map((person) => [person.id, person.display_name]));
    return NextResponse.json({ data: logs.data.map((item) => ({ ...item, actor_name: item.actor_id ? names[item.actor_id] || "已停用账号" : "系统" })), total: Number(logs.response.headers.get("content-range")?.split("/")[1] || 0), page, pageSize });
  } catch { return NextResponse.json({ message: "操作记录暂时无法读取。" }, { status: 503 }); }
}

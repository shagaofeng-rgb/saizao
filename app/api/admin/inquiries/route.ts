import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rpc } from "@/lib/supabase-server";

const date = (value: string | null, fallback: Date) => { const parsed = value ? new Date(value) : fallback; return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString(); };
export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams; const now = new Date(); const start = new Date(now); start.setUTCDate(start.getUTCDate() - 89);
  const data = await rpc("admin_list_leads", { p_from: date(search.get("from"), start), p_to: date(search.get("to"), now), p_status: search.get("status") || null, p_query: search.get("q")?.trim().slice(0, 100) || null, p_page: Math.max(1, Number(search.get("page") || 1)), p_page_size: Math.min(100, Math.max(20, Number(search.get("pageSize") || 20))) }).catch(() => null);
  return data ? NextResponse.json({ data }) : NextResponse.json({ message: "暂时无法读取询盘。" }, { status: 503 });
}

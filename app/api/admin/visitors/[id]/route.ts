import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rpc } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ message: "无效访客编号。" }, { status: 400 });
  const data = await rpc("admin_get_visitor_detail", { p_visitor_id: id }).catch(() => null);
  return data ? NextResponse.json({ data }) : NextResponse.json({ message: "暂时无法读取访问详情。" }, { status: 503 });
}

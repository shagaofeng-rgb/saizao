import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rpc } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Number(search.get("page")) || 1));
  const pageSize = [20, 50, 100].includes(Number(search.get("pageSize"))) ? Number(search.get("pageSize")) : 20;
  try {
    const data = await rpc<{ total: number; items: unknown[] }>("admin_content_issues", { p_page: page, p_page_size: pageSize });
    return NextResponse.json({ data, page, pageSize });
  } catch { return NextResponse.json({ message: "暂时无法核对内容质量。" }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const page = Math.min(10000, Math.max(1, Number(search.get("page")) || 1));
  const pageSize = [20, 50, 100].includes(Number(search.get("pageSize"))) ? Number(search.get("pageSize")) : 20;
  try {
    const [data, products, articles] = await Promise.all([
      rpc<{ total: number; items: unknown[] }>("admin_content_issues", { p_page: page, p_page_size: pageSize }),
      rest<{ id: string }[]>("products?select=id&status=eq.published&is_demo=eq.false&limit=1", { headers: { Prefer: "count=exact" } }),
      rest<{ id: string }[]>("articles?select=id&status=eq.published&limit=1", { headers: { Prefer: "count=exact" } }),
    ]);
    const count = (result: typeof products) => Number(result.response.headers.get("content-range")?.split("/")[1] || 0);
    return NextResponse.json({ data: { ...data, publishedTotal: count(products) + count(articles) }, page, pageSize });
  } catch { return NextResponse.json({ message: "暂时无法核对内容质量。" }, { status: 503 }); }
}

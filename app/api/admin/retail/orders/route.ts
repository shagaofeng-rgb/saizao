import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { rest } from "@/lib/supabase-server";
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || !["super_admin", "admin", "sales"].includes(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams; const page = Math.max(1, Number(search.get("page") || 1)); const pageSize = Math.min(50, Math.max(10, Number(search.get("pageSize") || 10)));
  const status = search.get("status"); const filter = status && ["pending", "paid", "cancelled", "expired", "refunded"].includes(status) ? `&status=eq.${status}` : "";
  const dateFilter = (key: "from" | "to", comparison: "gte" | "lte") => {
    const value = search.get(key);
    if (!value || Number.isNaN(Date.parse(value))) return "";
    return `&created_at=${comparison}.${encodeURIComponent(new Date(value).toISOString())}`;
  };
  try {
    const { data, response } = await rest(`retail_orders?select=id,order_number,buyer_name,buyer_email,country_code,subtotal_minor,shipping_minor,tax_minor,total_minor,currency,status,fulfillment_status,provider_order_id,tracking_number,carrier,created_at,paid_at,retail_order_items(id,product_title,variant_label,quantity,unit_price_minor,line_total_minor)&order=created_at.desc&limit=${pageSize}&offset=${(page - 1) * pageSize}${filter}${dateFilter("from", "gte")}${dateFilter("to", "lte")}`, { headers: { Prefer: "count=exact" } });
    return NextResponse.json({ data, total: Number((response.headers.get("content-range") || "0/0").split("/")[1]), page, pageSize });
  } catch { return NextResponse.json({ message: "订单读取失败。" }, { status: 503 }); }
}
